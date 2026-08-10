"use client";

// 登入頁（Supabase Auth）。
// 靜態站沒有伺服器可驗證，改由瀏覽器直接呼叫 Supabase 的 signInWithPassword，
// 成功後 session 會存在瀏覽器，首頁的登入守衛（AuthGuard）再據此放行。
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error: signInError } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        // supabase-js 連不到伺服器時也是回傳 error（不是 throw），
        // 用 status 區分「帳密錯誤（400/401）」與「連線問題」，避免誤導。
        const isNetworkIssue =
          signInError.name === "AuthRetryableFetchError" || !signInError.status;
        setError(isNetworkIssue ? "連線失敗，請檢查網路後再試" : "帳號或密碼錯誤");
      } else {
        // 成功：導回首頁（維持按鈕 disabled 直到跳轉完成）
        router.replace("/");
        return;
      }
    } catch (err) {
      // 環境變數未設定或網路異常
      setError(err instanceof Error ? err.message : "連線失敗，請檢查網路後再試");
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
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                帳號（Email）
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
