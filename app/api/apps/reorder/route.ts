import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { apps } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/apps/reorder —— 批次更新排序
 * body: { ids: string[] }  依陣列順序指定 sortOrder（index 即為新順序）
 */
export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求內容不是合法 JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids : null;
  if (!ids || ids.some((id) => typeof id !== "string")) {
    return Response.json({ error: "ids 必須是字串陣列" }, { status: 400 });
  }

  const db = await getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.update(apps).set({ sortOrder: i }).where(eq(apps.id, ids[i] as string));
    }
  });

  return Response.json({ ok: true });
}
