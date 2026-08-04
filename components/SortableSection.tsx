"use client";

// 分類區塊：支援分類拖曳排序（把手在標題）與分類重新命名，
// 內層再包一層 SortableContext 讓該分類的 app 可組內拖曳排序。
import { useEffect, useRef, useState } from "react";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { App } from "@/lib/types";
import AppIcon from "./AppIcon";

export interface Group {
  key: string;
  isUncategorized: boolean;
  apps: App[];
  minOrder: number;
}

interface Props {
  group: Group;
  showHeadings: boolean;
  editMode: boolean;
  dndEnabled: boolean;
  onOpenEditor: (app: App) => void;
  onPeek: (app: App) => void;
  onDelete: (app: App) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
}

export default function SortableSection({
  group,
  showHeadings,
  editMode,
  dndEnabled,
  onOpenEditor,
  onPeek,
  onDelete,
  onRenameCategory,
}: Props) {
  // 未分類永遠釘在最後、不可被拖動、不可重新命名
  const sortDisabled = !dndEnabled || group.isUncategorized;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `cat:${group.key}`, disabled: sortDisabled });

  const canRename = dndEnabled && !group.isUncategorized;

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(group.key);
  const inputRef = useRef<HTMLInputElement>(null);

  // 離開編輯模式時關閉未儲存的重新命名：於 render 期間校正 state，
  // 避免在 effect 內同步 setState 造成 cascading render。
  const [prevDndEnabled, setPrevDndEnabled] = useState(dndEnabled);
  if (prevDndEnabled !== dndEnabled) {
    setPrevDndEnabled(dndEnabled);
    if (!dndEnabled && renaming) setRenaming(false);
  }

  useEffect(() => {
    if (renaming) inputRef.current?.focus();
  }, [renaming]);

  const startRename = () => {
    if (!canRename) return;
    setDraft(group.key);
    setRenaming(true);
  };

  const commitRename = () => {
    if (!renaming) return;
    const next = draft.trim();
    setRenaming(false);
    if (next && next !== group.key) onRenameCategory(group.key, next);
  };

  const cancelRename = () => {
    setRenaming(false);
    setDraft(group.key);
  };

  const appIds = group.apps.map((a) => a.id);

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 opacity-80" : undefined}
    >
      {showHeadings && (
        <div className="mb-3 flex items-center gap-1 px-1">
          {dndEnabled && !group.isUncategorized && (
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label={`拖曳排序「${group.key}」分類`}
              className="-ml-1 grid h-8 w-8 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-neutral-400 transition active:scale-90 active:cursor-grabbing hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="9" cy="6" r="1.6" />
                <circle cx="15" cy="6" r="1.6" />
                <circle cx="9" cy="12" r="1.6" />
                <circle cx="15" cy="12" r="1.6" />
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="15" cy="18" r="1.6" />
              </svg>
            </button>
          )}

          {renaming ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
              aria-label="分類名稱"
              className="min-w-0 flex-1 rounded-lg border border-blue-400 bg-white px-2 py-0.5 text-[22px] font-bold leading-tight text-neutral-900 outline-none focus:ring-2 focus:ring-blue-100 dark:bg-neutral-800 dark:text-white dark:focus:ring-blue-900/40"
            />
          ) : (
            <h2
              onClick={canRename ? startRename : undefined}
              className={`text-[22px] font-bold leading-tight text-neutral-900 dark:text-white ${
                canRename ? "cursor-text" : ""
              }`}
            >
              {group.isUncategorized ? "未分類" : group.key}
            </h2>
          )}

          {canRename && !renaming && (
            <button
              type="button"
              onClick={startRename}
              aria-label={`重新命名「${group.key}」分類`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition active:scale-90 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
        </div>
      )}

      <SortableContext items={appIds} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-3 gap-y-5 px-1">
          {group.apps.map((app, index) => (
            <AppIcon
              key={app.id}
              app={app}
              index={index}
              editMode={editMode}
              dndEnabled={dndEnabled}
              onOpenEditor={onOpenEditor}
              onPeek={onPeek}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  );
}
