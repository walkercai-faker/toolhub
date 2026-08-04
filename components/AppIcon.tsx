"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { App } from "@/lib/types";
import { gradientFor, initialOf } from "@/lib/gradient";

interface Props {
  app: App;
  editMode: boolean;
  /** 是否啟用拖曳排序（僅編輯模式且未搜尋時為 true） */
  dndEnabled: boolean;
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
  dndEnabled,
  index,
  onOpenEditor,
  onPeek,
  onDelete,
}: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  // 記錄 pointerdown 位置，用來判斷「這次 click 其實是拖曳／滑動」，不依賴時序
  const downPos = useRef<{ x: number; y: number } | null>(null);

  // 組內拖曳排序：非編輯模式或搜尋中一律 disabled
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id, disabled: !dndEnabled });

  // 記錄拖曳剛結束的時間，用來吞掉拖曳後殘留的 click（避免誤開編輯表單）
  const wasDragging = useRef(false);
  const dragEndAt = useRef(0);
  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true;
    } else if (wasDragging.current) {
      wasDragging.current = false;
      dragEndAt.current = Date.now();
    }
  }, [isDragging]);

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
    // 按下與放開位置差距大 → 這是拖曳／滑動後殘留的 click：一律吞掉（不開連結、不開編輯）
    const dp = downPos.current;
    downPos.current = null;
    if (dp && (Math.abs(e.clientX - dp.x) > 6 || Math.abs(e.clientY - dp.y) > 6)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // 拖曳剛結束殘留的 click（時序保險）：吞掉，避免誤觸
    if (Date.now() - dragEndAt.current < 250) {
      e.preventDefault();
      return;
    }
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

  const recordDownPos = (e: React.PointerEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY };
  };

  // 拖曳模式套用 dnd 手勢監聽（並先記錄按下位置）；否則維持原本的長按 peek 手勢
  const gestureProps = dndEnabled
    ? {
        ...attributes,
        ...listeners,
        onPointerDown: (e: React.PointerEvent) => {
          recordDownPos(e);
          (listeners as { onPointerDown?: (e: React.PointerEvent) => void })?.onPointerDown?.(e);
        },
      }
    : {
        onPointerDown: (e: React.PointerEvent) => {
          recordDownPos(e);
          handlePointerDown(e);
        },
        onPointerMove: handlePointerMove,
        onPointerUp: clearTimer,
        onPointerCancel: clearTimer,
        onPointerLeave: clearTimer,
      };

  return (
    <div
      ref={setNodeRef}
      style={
        dndEnabled
          ? { transform: CSS.Transform.toString(transform), transition }
          : undefined
      }
      className={`relative flex flex-col items-center gap-1.5 ${
        isDragging ? "z-20 opacity-60" : ""
      }`}
    >
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
        onContextMenu={handleContextMenu}
        {...gestureProps}
        aria-label={app.title}
        className={`squircle no-callout relative block aspect-square w-16 transition-transform duration-100 will-change-transform active:scale-90 ${
          editMode && !isDragging ? "jiggle" : ""
        } ${dndEnabled ? "cursor-grab touch-none active:cursor-grabbing" : ""}`}
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
