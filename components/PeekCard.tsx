"use client";

import { useEffect } from "react";
import type { App } from "@/lib/types";
import { gradientFor, initialOf } from "@/lib/gradient";

interface Props {
  app: App;
  onClose: () => void;
}

export default function PeekCard({ app, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasIcon = Boolean(app.icon);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="animate-pop-in w-full max-w-xs rounded-3xl border border-white/50 bg-white/85 p-6 text-center shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/85"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${app.title} 預覽`}
      >
        <div className="mx-auto squircle h-20 w-20">
          {hasIcon ? (
            // eslint-disable-next-line @next/next/no-img-element -- icon 可能是 base64 data URL 或任意外部網址
            <img src={app.icon as string} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-3xl font-semibold text-white"
              style={{ backgroundImage: gradientFor(app.color || app.title) }}
            >
              {initialOf(app.title)}
            </span>
          )}
        </div>

        <h2 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">
          {app.title}
        </h2>

        <p className="mt-1 break-all text-xs text-neutral-400 dark:text-neutral-500">
          {app.url}
        </p>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {app.description?.trim() ? app.description : "尚無描述"}
        </p>

        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98] hover:bg-blue-500"
        >
          開啟連結
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-2xl py-2.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          關閉
        </button>
      </div>
    </div>
  );
}
