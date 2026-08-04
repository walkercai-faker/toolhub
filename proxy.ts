import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * 整站守門（Next.js 16 的 proxy，前身為 middleware）。
 *
 * 除了下列公開路徑外，所有請求都必須帶有效的 th_session cookie：
 *   - /login          登入頁本身
 *   - /api/login      登入 API
 *   - /api/logout     登出 API
 * （_next 內部資源與靜態檔已在下方 matcher 排除，不會進到這裡。）
 *
 * 驗證失敗時：
 *   - /api/* → 回 401 JSON
 *   - 其餘頁面 → 302 導向 /login，並帶上原本要去的位置（登入後可導回）
 */

const PUBLIC_PATHS = ["/login", "/api/login", "/api/logout"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (session) {
    return NextResponse.next();
  }

  // 未通過驗證的 API：回 401，不要重導（前端好處理）
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "未授權，請先登入" }, { status: 401 });
  }

  // 一般頁面：導向登入頁，並記住原本目的地
  const loginUrl = new URL("/login", request.url);
  const target = `${pathname}${search}`;
  if (target && target !== "/") {
    loginUrl.searchParams.set("next", target);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // 套用到「除了 _next 內部資源與靜態檔以外」的所有路徑（含 /api/*，以保護後端）。
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
