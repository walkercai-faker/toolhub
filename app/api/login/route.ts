import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  isAuthConfigured,
  signSession,
  timingSafeEqual,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/login —— 比對帳密，成功則設 session cookie */
export async function POST(request: Request) {
  // 環境變數未設 → 一律拒絕，避免無密碼裸奔
  if (!isAuthConfigured()) {
    console.error(
      "[auth] 缺少 APP_USERNAME / APP_PASSWORD / AUTH_SECRET 環境變數，登入一律拒絕。請於 .env.local 或部署平台設定。",
    );
    return Response.json({ error: "伺服器尚未設定登入資訊" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "請求內容不是合法 JSON" }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  // 兩個比較都先跑完再判斷，避免用 && 短路造成的 timing 差異
  const okUser = await timingSafeEqual(username, process.env.APP_USERNAME!);
  const okPass = await timingSafeEqual(password, process.env.APP_PASSWORD!);
  if (!okUser || !okPass) {
    return Response.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await signSession({ u: process.env.APP_USERNAME!, exp });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true, // 防止 XSS 竊取
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // 正式環境才要求 HTTPS
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return Response.json({ ok: true });
}
