import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { apps, type NewAppRow } from "@/db/schema";
import { normalizeUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 空字串 → null，並去除前後空白 */
function emptyToNull(value: unknown): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

/** PATCH /api/apps/[id] —— 更新任意欄位 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/apps/[id]">,
) {
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求內容不是合法 JSON" }, { status: 400 });
  }

  const patch: Partial<NewAppRow> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return Response.json({ error: "title 不可為空" }, { status: 400 });
    patch.title = title;
  }
  if (body.url !== undefined) {
    const url = normalizeUrl(typeof body.url === "string" ? body.url : "");
    if (!url) return Response.json({ error: "url 不可為空" }, { status: 400 });
    patch.url = url;
  }
  if (body.description !== undefined) patch.description = emptyToNull(body.description);
  if (body.icon !== undefined) patch.icon = emptyToNull(body.icon);
  if (body.color !== undefined) patch.color = emptyToNull(body.color);
  if (body.category !== undefined) patch.category = emptyToNull(body.category);
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder);

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const db = await getDb();
  const [row] = await db.update(apps).set(patch).where(eq(apps.id, id)).returning();

  if (!row) return Response.json({ error: "找不到該工具" }, { status: 404 });
  return Response.json(row);
}

/** DELETE /api/apps/[id] —— 刪除工具 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/apps/[id]">,
) {
  const { id } = await ctx.params;

  const db = await getDb();
  const [row] = await db.delete(apps).where(eq(apps.id, id)).returning();

  if (!row) return Response.json({ error: "找不到該工具" }, { status: 404 });
  return Response.json({ ok: true, id: row.id });
}
