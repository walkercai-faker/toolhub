"use client";

// 整站共用密碼登入頁。
// 本頁在 proxy.ts 的公開清單內，不會被守門攔截。
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * 淨化登入後要導回的目的地：只允許「站內絕對路徑」。
 * 擋掉 //evil.com、/\evil.com、https://... 這類開放重導（open redirect）攻擊。
 */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        // 成功：整頁導向（而非 SPA 跳頁），確保帶著新 cookie 重新進站
        window.location.href = next;
        return; // 維持按鈕 disabled 直到跳轉完成
      }
      if (res.status === 401) {
        setError("帳號或密碼錯誤");
      } else {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "登入失敗，請稍後再試");
      }
    } catch {
      setError("連線失敗，請檢查網路後再試");
    }
    setSubmitting(false);
  };

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-blue-900/40";

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        {/* App 標誌 */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="squircle mb-4 grid h-20 w-20 place-items-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <svg
              viewBox="0 0 24 24"
              className="h-9 w-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            貳輪嶼工具箱
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            請登入以繼續使用
          </p>
        </div>

        {/* 登入卡片 */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/70"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                帳號
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="username"
                placeholder="請輸入帳號"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="請輸入密碼"
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-blue-600 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "登入中…" : "登入"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  // useSearchParams 需要 Suspense 邊界，否則 next build 預渲染會報錯
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
