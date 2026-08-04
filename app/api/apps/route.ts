import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { apps } from "@/db/schema";
import { normalizeUrl } from "@/lib/url";

// PGlite 需要 Node runtime，不能用 edge
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 空字串 → null，並去除前後空白 */
function emptyToNull(value: unknown): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str.length > 0 ? str : null;
}

/** GET /api/apps —— 回傳所有工具，依 sortOrder（再依建立時間）排序 */
export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(apps).orderBy(apps.sortOrder, apps.createdAt);
  return Response.json(rows);
}

/** POST /api/apps —— 建立工具 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求內容不是合法 JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const url = normalizeUrl(typeof body.url === "string" ? body.url : "");

  if (!title || !url) {
    return Response.json({ error: "title 與 url 為必填" }, { status: 400 });
  }

  const db = await getDb();

  // 新工具排到最後：目前最大 sortOrder + 1
  const maxResult = await db
    .select({ value: sql<number>`coalesce(max(${apps.sortOrder}), -1)` })
    .from(apps);
  const nextOrder = Number(maxResult[0]?.value ?? -1) + 1;

  const [row] = await db
    .insert(apps)
    .values({
      title,
      url,
      description: emptyToNull(body.description),
      icon: emptyToNull(body.icon),
      color: emptyToNull(body.color),
      category: emptyToNull(body.category),
      sortOrder: nextOrder,
    })
    .returning();

  return Response.json(row, { status: 201 });
}
