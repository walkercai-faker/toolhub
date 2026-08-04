"use client";

import { useRef } from "react";
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
const DRAG_THRESHOLD = 6;

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
  // 以 pointer 事件（可靠座標）判斷這次互動是「拖曳／滑動」還是「純點擊」
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  // 組內拖曳排序：非編輯模式或搜尋中一律 disabled
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id, disabled: !dndEnabled });

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

  // 統一手勢：按下記錄起點並重設位移旗標；移動超過門檻即標記為「拖曳」
  const onPointerDown = (e: React.PointerEvent) => {
    downPos.current = { x: e.clientX, y: e.clientY };
    movedRef.current = false;
    if (dndEnabled) {
      (listeners as { onPointerDown?: (e: React.PointerEvent) => void })?.onPointerDown?.(e);
    } else {
      handlePointerDown(e);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = downPos.current;
    if (
      d &&
      (Math.abs(e.clientX - d.x) > DRAG_THRESHOLD ||
        Math.abs(e.clientY - d.y) > DRAG_THRESHOLD)
    ) {
      movedRef.current = true;
    }
    if (!dndEnabled) handlePointerMove(e);
  };
  const onPointerUpOrLeave = () => {
    if (!dndEnabled) clearTimer();
  };

  const handleClick = (e: React.MouseEvent) => {
    const moved = movedRef.current || isDragging;
    movedRef.current = false;
    downPos.current = null;

    // 編輯模式：一律不導航（<a> 也不帶 href）。純點擊開編輯表單，拖曳不動作。
    if (editMode) {
      e.preventDefault();
      if (!moved) onOpenEditor(app);
      return;
    }
    // 一般模式：拖曳／滑動，或剛長按看過描述 → 擋掉，不開連結
    if (moved || longPressed.current) {
      e.preventDefault();
      longPressed.current = false;
      return;
    }
    // 純點擊 → 讓帶 href 的 <a> 在新分頁開啟
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    // 桌面右鍵 = 看描述
    e.preventDefault();
    onPeek(app);
  };

  const hasIcon = Boolean(app.icon);

  // 拖曳模式套用 dnd 監聽；兩種模式都掛統一手勢以記錄位移
  const gestureProps = dndEnabled
    ? {
        ...attributes,
        ...listeners,
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerUpOrLeave,
      }
    : {
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerUpOrLeave,
        onPointerCancel: onPointerUpOrLeave,
        onPointerLeave: onPointerUpOrLeave,
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
        // 編輯模式不帶 href → 拖曳／點擊都不可能觸發原生導航
        href={editMode ? undefined : app.url}
        target="_blank"
        rel="noopener noreferrer"
        draggable={false}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        {...gestureProps}
        aria-label={app.title}
        className={`squircle no-callout relative block aspect-square w-16 transition-transform duration-100 will-change-transform active:scale-90 ${
          editMode && !isDragging ? "jiggle" : ""
        } ${dndEnabled ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"}`}
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
