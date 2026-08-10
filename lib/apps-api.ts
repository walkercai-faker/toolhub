import { getSupabase } from "./supabase";
import { normalizeUrl } from "./url";
import type { App, AppInput } from "./types";

/**
 * 工具（apps）資料層 —— 瀏覽器直連 Supabase。
 *
 * 這裡取代了原本的 /api/apps 系列 route handler，
 * 同時負責「資料庫 snake_case ↔ 前端 camelCase」的欄位轉換：
 *   DB:  sort_order / created_at
 *   前端: sortOrder  / createdAt
 *
 * 資料驗證行為與原本 API 一致：
 *   - title / url 必填，url 會先 normalizeUrl 補上 https://
 *   - description / icon / color / category 空字串一律存成 null
 *
 * 寫入權限由 Supabase RLS policy 把關（未登入的 anon 不該能寫）。
 */

const TABLE = "apps";

/** 資料庫實際的欄位形狀（snake_case） */
interface AppRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
  sort_order: number | null;
  created_at: string;
}

/** 可更新的欄位（皆為選填，只送有帶的欄位） */
export type AppPatch = Partial<AppInput> & { sortOrder?: number };

/** 空字串 → null，並去除前後空白 */
function emptyToNull(value: unknown): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

/** DB row → 前端型別 */
function toApp(row: AppRow): App {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    description: row.description,
    icon: row.icon,
    color: row.color,
    category: row.category,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

/** 把 Supabase 的錯誤轉成好讀的 Error（含原始訊息，方便排查 RLS 問題） */
function fail(action: string, error: { message?: string } | null): never {
  throw new Error(`${action}：${error?.message ?? "未知錯誤"}`);
}

/** 讀取全部工具，依 sort_order（再依建立時間）排序 */
export async function listApps(): Promise<App[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) fail("載入工具失敗", error);
  return ((data ?? []) as AppRow[]).map(toApp);
}

/** 目前最大的 sort_order（沒有資料時回 -1） */
async function maxSortOrder(): Promise<number> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) fail("讀取排序失敗", error);
  const rows = (data ?? []) as Pick<AppRow, "sort_order">[];
  return rows.length > 0 ? Number(rows[0].sort_order ?? -1) : -1;
}

/** 新增工具（排到最後） */
export async function createApp(input: AppInput): Promise<App> {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const url = normalizeUrl(typeof input.url === "string" ? input.url : "");
  if (!title || !url) throw new Error("名稱與連結為必填");

  const nextOrder = (await maxSortOrder()) + 1;

  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert({
      title,
      url,
      description: emptyToNull(input.description),
      icon: emptyToNull(input.icon),
      color: emptyToNull(input.color),
      category: emptyToNull(input.category),
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error || !data) fail("建立失敗", error);
  return toApp(data as AppRow);
}

/** 更新工具（只送有帶的欄位） */
export async function updateApp(id: string, patch: AppPatch): Promise<App> {
  const row: Record<string, string | number | null> = {};

  if (patch.title !== undefined) {
    const title = typeof patch.title === "string" ? patch.title.trim() : "";
    if (!title) throw new Error("名稱不可為空");
    row.title = title;
  }
  if (patch.url !== undefined) {
    const url = normalizeUrl(typeof patch.url === "string" ? patch.url : "");
    if (!url) throw new Error("連結不可為空");
    row.url = url;
  }
  if (patch.description !== undefined) row.description = emptyToNull(patch.description);
  if (patch.icon !== undefined) row.icon = emptyToNull(patch.icon);
  if (patch.color !== undefined) row.color = emptyToNull(patch.color);
  if (patch.category !== undefined) row.category = emptyToNull(patch.category);
  if (patch.sortOrder !== undefined) row.sort_order = Number(patch.sortOrder);

  if (Object.keys(row).length === 0) throw new Error("沒有可更新的欄位");

  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) fail("更新失敗", error);
  return toApp(data as AppRow);
}

/** 刪除工具 */
export async function deleteApp(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq("id", id);
  if (error) fail("刪除失敗", error);
}

/**
 * 批次更新排序：陣列 index 即為新的 sort_order。
 * 靜態站沒有交易可用，改成多筆 update 併發送出；任一筆失敗就整體視為失敗，
 * 由呼叫端回滾畫面（下次重新載入會以 DB 為準）。
 */
export async function reorderApps(ids: string[]): Promise<void> {
  const supabase = getSupabase();
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from(TABLE).update({ sort_order: index }).eq("id", id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) fail("排序儲存失敗", failed.error);
}
