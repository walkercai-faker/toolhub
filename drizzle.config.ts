import type { Config } from "drizzle-kit";

/**
 * 供未來 Supabase / Postgres 使用（drizzle-kit generate / migrate）。
 * 本機 PGlite 不走這裡，改由 db/index.ts 的 bootstrap DDL 建表。
 */
export default {
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
