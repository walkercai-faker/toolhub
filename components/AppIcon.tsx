"use client";

import { useRef } from "react";
import type { App } from "@/lib/types";
import { gradientFor, initialOf } from "@/lib/gradient";

interface Props {
  app: App;
  editMode: boolean;
  index: number;
  onOpenEditor: (app: App) => void;
  onPeek: (app: App) => void;
  onDelete: (app: App) => void;
}

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 10;

export default function AppIcon({
  app,
  editMode,
  index,
  onOpenEditor,
  onPeek,
  onDelete,
}: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editMode) return;
    longPressed.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onPeek(app);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    if (
      Math.abs(e.clientX - start.current.x) > MOVE_TOLERANCE ||
      Math.abs(e.clientY - start.current.y) > MOVE_TOLERANCE
    ) {
      clearTimer();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // 編輯模式：點 icon 開啟編輯表單，不開連結
    if (editMode) {
      e.preventDefault();
      onOpenEditor(app);
      return;
    }
    // 剛剛是長按（已彈出 peek）：擋掉這次點擊，不開連結
    if (longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
    }
    // 否則：讓 <a> 預設行為在新分頁開啟
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // 桌面右鍵 = 看描述
    e.preventDefault();
    onPeek(app);
  };

  const hasIcon = Boolean(app.icon);

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      {editMode && (
        <button
          type="button"
          aria-label={`刪除 ${app.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(app);
          }}
          className="absolute -left-1.5 -top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-neutral-800/95 text-white shadow-md ring-2 ring-white/80 transition active:scale-90 dark:ring-neutral-900/80"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearTimer}
        onPointerCancel={clearTimer}
        onPointerLeave={clearTimer}
        onContextMenu={handleContextMenu}
        aria-label={app.title}
        className={`squircle no-callout relative block aspect-square w-16 transition-transform duration-100 will-change-transform active:scale-90 ${
          editMode ? "jiggle" : ""
        }`}
        style={editMode ? { animationDelay: `${(index % 5) * 45}ms` } : undefined}
      >
        {hasIcon ? (
          // eslint-disable-next-line @next/next/no-img-element -- icon 可能是 base64 data URL 或任意外部網址
          <img
            src={app.icon as string}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white"
            style={{ backgroundImage: gradientFor(app.color || app.title) }}
          >
            {initialOf(app.title)}
          </span>
        )}
      </a>

      <span className="line-clamp-2 max-w-[76px] text-center text-[11px] font-medium leading-tight text-neutral-700 dark:text-neutral-200">
        {app.title}
      </span>
    </div>
  );
}
