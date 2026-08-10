"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Status = "checking" | "authed" | "error";

/**
 * 客戶端登入守衛。
 *
 * 靜態站沒有伺服器可以做重導守門（原本的 proxy.ts 已移除），
 * 因此改在瀏覽器檢查 Supabase session：
 *   1. 先 getSession()，沒有 session 就 router.replace("/login")
 *   2. 檢查完成前只顯示載入狀態，不會閃現內容
 *   3. onAuthStateChange 監聽登出／session 過期，即時踢回登入頁
 *
 * 注意：這一層只是 UI 體驗，真正的資料安全靠 Supabase RLS
 * （未登入者即使繞過這個畫面，也讀寫不到 apps 資料表）。
 */
export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (data.session) {
          setStatus("authed");
        } else {
          router.replace("/login");
        }

        // 登出或 session 失效時即時反應
        const { data: listener } = supabase.auth.onAuthStateChange(
          (_event, session) => {
            if (!active) return;
            if (session) {
              setStatus("authed");
            } else {
              setStatus("checking");
              router.replace("/login");
            }
          },
        );
        unsubscribe = () => listener.subscription.unsubscribe();
      } catch (err) {
        if (!active) return;
        setMessage(err instanceof Error ? err.message : "初始化失敗");
        setStatus("error");
      }
    })();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-6">
        <p
          role="alert"
          className="max-w-sm text-center text-sm text-neutral-500 dark:text-neutral-400"
        >
          {message}
        </p>
      </div>
    );
  }

  if (status !== "authed") {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <div
          role="status"
          aria-label="載入中"
          className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600 dark:border-white/15 dark:border-t-blue-500"
        />
      </div>
    );
  }

  return <>{children}</>;
}
