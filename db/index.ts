import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * 本模組的 DB 型別以 PGlite 版本為準。
 * postgres-js（Supabase）與 PGlite 共用 drizzle-orm/pg-core 的查詢 API，
 * 兩者的查詢建構器完全相同，因此對 postgres-js 實例做型別轉換在執行期是安全的。
 */
export type DB = PgliteDatabase<typeof schema>;

/**
 * Bootstrap DDL —— PGlite 無法用 drizzle-kit push，
 * 因此在初始化時執行 CREATE TABLE IF NOT EXISTS 建表。
 * 對 Postgres/Supabase 同樣安全（冪等）。
 */
const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  icon text,
  color text,
  category text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- 既有資料庫補欄位（冪等；Postgres/PGlite 皆支援 IF NOT EXISTS）
ALTER TABLE apps ADD COLUMN IF NOT EXISTS category text;
`;

async function createDb(): Promise<DB> {
  // 有 DATABASE_URL → 走 Supabase / Postgres（postgres-js）
  if (process.env.DATABASE_URL) {
    const [{ drizzle }, postgresMod] = await Promise.all([
      import("drizzle-orm/postgres-js"),
      import("postgres"),
    ]);
    const postgres = postgresMod.default;
    // prepare: false —— 相容 Supabase transaction pooler（pgbouncer，port 6543）；
    // max: 1 —— serverless 每個實例只開一條連線，避免連線數爆掉。
    const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    await client.unsafe(BOOTSTRAP_SQL);
    return drizzle(client, { schema }) as unknown as DB;
  }

  // 否則 → 本機 PGlite，資料持久化到 ./.pgdata
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
  ]);
  const dataDir = process.env.PGLITE_DATA_DIR ?? "./.pgdata";
  const client = new PGlite(dataDir);
  await client.waitReady;
  await client.exec(BOOTSTRAP_SQL);
  return drizzle(client, { schema });
}

/**
 * 以 globalThis 快取單例，避免 dev 模式熱更新時重複建立連線。
 * lazy 初始化：只有第一次呼叫 getDb()（在 API handler 內）才會真的連線，
 * 因此不會在 build 期間執行。
 */
const globalForDb = globalThis as unknown as {
  __toolhubDbPromise?: Promise<DB>;
};

export function getDb(): Promise<DB> {
  if (!globalForDb.__toolhubDbPromise) {
    globalForDb.__toolhubDbPromise = createDb();
  }
  return globalForDb.__toolhubDbPromise;
}
