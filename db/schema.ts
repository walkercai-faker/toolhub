import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * apps 資料表 —— PGlite 與 Supabase/Postgres 共用同一份定義。
 * 本機（PGlite）由 db/index.ts 的 bootstrap DDL 建表；
 * 未來 Supabase 可改用 drizzle-kit migrate（見 drizzle.config.ts）。
 */
export const apps = pgTable("apps", {
  // uuid 主鍵，預設由資料庫 gen_random_uuid() 產生
  id: uuid("id").primaryKey().defaultRandom(),
  // 工具名稱（必填）
  title: text("title").notNull(),
  // 連結（必填）
  url: text("url").notNull(),
  // 描述（可空）
  description: text("description"),
  // 圖示：base64 data URL 或圖片網址（可空）
  icon: text("icon"),
  // 沒有 icon 時當作漸層底色的 seed（可空）
  color: text("color"),
  // 排序用，預設用建立順序
  sortOrder: integer("sort_order").notNull().default(0),
  // 建立時間，預設現在
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppRow = typeof apps.$inferSelect;
export type NewAppRow = typeof apps.$inferInsert;
