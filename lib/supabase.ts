import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 瀏覽器直連 Supabase 的單例 client。
 *
 * 這兩個 NEXT_PUBLIC_* 變數會在 next build 時被內嵌進 JS bundle。
 * anon key 本來就設計成可公開（等同「未登入訪客」身分），
 * 真正的資料安全靠 Supabase 的 RLS policy 把關，不是靠藏 key。
 *
 * 採「延遲建立」的單例：createClient 只在第一次真的要用時才執行。
 * 靜態匯出（next build）會在 Node 端預先渲染頁面，若在模組載入當下就 createClient，
 * 缺變數時整個 build 會直接掛掉；延遲建立可讓 build 正常產出，
 * 而在瀏覽器實際操作時才丟出清楚的中文錯誤。
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 環境變數是否齊全（可用來在 UI 顯示設定提示） */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const SUPABASE_ENV_ERROR =
  "尚未設定 Supabase 連線資訊：請提供 NEXT_PUBLIC_SUPABASE_URL 與 NEXT_PUBLIC_SUPABASE_ANON_KEY（本機放 .env.local，正式站放 GitHub repo 的 Variables，並重新 build）。";

let client: SupabaseClient | null = null;

/** 取得（必要時建立）Supabase client 單例 */
export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(SUPABASE_ENV_ERROR);
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // 登入狀態存在瀏覽器 localStorage，重新整理不會掉登入
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
