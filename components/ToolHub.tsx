"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { App, AppInput } from "@/lib/types";
import {
  createApp,
  deleteApp,
  listApps,
  reorderApps,
  updateApp,
} from "@/lib/apps-api";
import { getSupabase } from "@/lib/supabase";
import SortableSection from "./SortableSection";
import AppSheet from "./AppSheet";
import PeekCard from "./PeekCard";
import SearchBar from "./SearchBar";
import EmptyState from "./EmptyState";

interface SheetState {
  mode: "add" | "edit";
  app: App | null;
}

const UNCATEGORIZED_KEY = "__uncategorized__";

/**
 * 巢狀 sortable 的碰撞偵測：
 * 拖「分類」時只跟其他分類容器碰撞、拖「app」時只跟 app 碰撞，
 * 兩層互不干擾，避免拖 app 時誤中分類容器（反之亦然）。
 */
const collisionDetection: CollisionDetection = (args) => {
  const isCategory = String(args.active.id).startsWith("cat:");
  const containers = args.droppableContainers.filter(
    (c) => String(c.id).startsWith("cat:") === isCategory,
  );
  return closestCenter({ ...args, droppableContainers: containers });
};

const SAMPLES: Omit<AppInput, "icon" | "color">[] = [
  { title: "Google", url: "https://www.google.com", description: "搜尋引擎" },
  { title: "Gmail", url: "https://mail.google.com", description: "電子郵件" },
  { title: "YouTube", url: "https://www.youtube.com", description: "影音平台" },
  { title: "Notion", url: "https://www.notion.so", description: "筆記與文件協作" },
];

export default function ToolHub() {
  const router = useRouter();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [peek, setPeek] = useState<App | null>(null);
  const [loadingSamples, setLoadingSamples] = useState(false);

  const loadApps = useCallback(async () => {
    try {
      setApps(await listApps());
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次載入：在 effect 內用 await 屏障後才 setState，避免同步 setState
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await listApps();
        if (active) {
          setApps(data);
          setLoadError(false);
        }
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q),
    );
  }, [apps, query]);

  // 依分類分組：組內照 sortOrder、組間照各組最小 sortOrder，未分類排最後
  const groups = useMemo(() => {
    const map = new Map<string, App[]>();
    for (const app of filtered) {
      const key = app.category?.trim() ? app.category.trim() : "";
      const list = map.get(key);
      if (list) list.push(app);
      else map.set(key, [app]);
    }
    const result = Array.from(map.entries()).map(([key, list]) => ({
      key: key === "" ? UNCATEGORIZED_KEY : key,
      isUncategorized: key === "",
      apps: [...list].sort((a, b) => a.sortOrder - b.sortOrder),
      minOrder: Math.min(...list.map((a) => a.sortOrder)),
    }));
    result.sort((a, b) => {
      if (a.isUncategorized !== b.isUncategorized) return a.isUncategorized ? 1 : -1;
      return a.minOrder - b.minOrder;
    });
    return result;
  }, [filtered]);

  // 有任何「有分類」的工具時才顯示分類標題（避免只有一個孤零零的「未分類」）
  const showHeadings = useMemo(() => groups.some((g) => !g.isUncategorized), [groups]);

  // 現有分類清單（去重、去空、排序）供表單快速選取
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    for (const app of apps) {
      const c = app.category?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
  }, [apps]);

  // 分類拖曳的可排序 id（未分類不參與，永遠釘在最後）
  const sortableCategoryIds = useMemo(
    () => groups.filter((g) => !g.isUncategorized).map((g) => `cat:${g.key}`),
    [groups],
  );

  // 拖曳排序僅在編輯模式且未搜尋時啟用：
  // 搜尋會讓分組只含子集，重排會漏掉被過濾的工具而破壞全域順序。
  const dndEnabled = editMode && query.trim() === "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // 依「攤平後的全域 id 順序」持久化排序：樂觀更新 sortOrder + 呼叫 reorder API
  const persistOrder = useCallback(
    (flatIds: string[]) => {
      const snapshot = apps;
      const orderIndex = new Map(flatIds.map((id, i) => [id, i] as const));
      setApps((prev) =>
        prev.map((a) =>
          orderIndex.has(a.id) ? { ...a, sortOrder: orderIndex.get(a.id)! } : a,
        ),
      );
      // 尚未寫入 DB 的樂觀新增（temp-）不送 API
      const ids = flatIds.filter((id) => !id.startsWith("temp-"));
      void (async () => {
        try {
          await reorderApps(ids);
        } catch {
          setApps(snapshot);
        }
      })();
    },
    [apps],
  );

  // 分類重新命名（樂觀更新）：把所有該分類的工具 category 改為新名，逐筆 PATCH
  const handleRenameCategory = useCallback(
    (oldName: string, newName: string) => {
      const to = newName.trim();
      if (!to || to === oldName) return;
      const targets = apps.filter((a) => (a.category?.trim() ?? "") === oldName);
      if (targets.length === 0) return;

      const snapshot = apps;
      setApps((prev) =>
        prev.map((a) =>
          (a.category?.trim() ?? "") === oldName ? { ...a, category: to } : a,
        ),
      );
      const persistTargets = targets.filter((a) => !a.id.startsWith("temp-"));
      void (async () => {
        try {
          await Promise.all(
            persistTargets.map((a) => updateApp(a.id, { category: to })),
          );
        } catch {
          setApps(snapshot);
        }
      })();
    },
    [apps],
  );

  // 拖曳結束：用 active id 是否為 "cat:" 前綴判斷拖的是分類還是 app
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      if (activeId.startsWith("cat:")) {
        // 拖曳分類：重排各組順序，未分類強制釘在最後
        if (!overId.startsWith("cat:")) return;
        const currentKeys = groups.map((g) => g.key);
        const oldIndex = currentKeys.indexOf(activeId.slice(4));
        const newIndex = currentKeys.indexOf(overId.slice(4));
        if (oldIndex < 0 || newIndex < 0) return;

        let newKeys = arrayMove(currentKeys, oldIndex, newIndex);
        const hadUncat = newKeys.includes(UNCATEGORIZED_KEY);
        newKeys = newKeys.filter((k) => k !== UNCATEGORIZED_KEY);
        if (hadUncat) newKeys.push(UNCATEGORIZED_KEY);

        const byKey = new Map(groups.map((g) => [g.key, g] as const));
        const flatIds = newKeys.flatMap(
          (k) => byKey.get(k)?.apps.map((a) => a.id) ?? [],
        );
        persistOrder(flatIds);
        return;
      }

      // 拖曳 app：僅支援組內重排（跨分類請用編輯表單改分類）
      const group = groups.find((g) => g.apps.some((a) => a.id === activeId));
      if (!group || !group.apps.some((a) => a.id === overId)) return;
      const ids = group.apps.map((a) => a.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const movedIds = arrayMove(ids, oldIndex, newIndex);
      const flatIds = groups.flatMap((g) =>
        g.key === group.key ? movedIds : g.apps.map((a) => a.id),
      );
      persistOrder(flatIds);
    },
    [groups, persistOrder],
  );

  // 新增（樂觀更新）
  const handleAdd = useCallback(
    async (values: AppInput) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: App = {
        id: tempId,
        title: values.title,
        url: values.url,
        description: values.description || null,
        icon: values.icon,
        color: values.color,
        category: values.category ?? null,
        sortOrder: Number.MAX_SAFE_INTEGER,
        createdAt: new Date().toISOString(),
      };
      setApps((prev) => [...prev, optimistic]);
      try {
        const created = await createApp(values);
        setApps((prev) => prev.map((a) => (a.id === tempId ? created : a)));
      } catch (e) {
        setApps((prev) => prev.filter((a) => a.id !== tempId));
        throw e;
      }
    },
    [],
  );

  // 編輯（樂觀更新，失敗回滾）
  const handleUpdate = useCallback(
    async (id: string, values: AppInput) => {
      const snapshot = apps;
      setApps((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                title: values.title,
                url: values.url,
                description: values.description || null,
                icon: values.icon,
                color: values.color,
                category: values.category ?? null,
              }
            : a,
        ),
      );
      try {
        const updated = await updateApp(id, values);
        setApps((prev) => prev.map((a) => (a.id === id ? updated : a)));
      } catch (e) {
        setApps(snapshot);
        throw e;
      }
    },
    [apps],
  );

  // 刪除（樂觀更新，失敗回滾）
  const handleDelete = useCallback(
    async (app: App) => {
      const snapshot = apps;
      setApps((prev) => prev.filter((a) => a.id !== app.id));
      setPeek((p) => (p?.id === app.id ? null : p));
      if (app.id.startsWith("temp-")) return; // 尚未寫入 DB
      try {
        await deleteApp(app.id);
      } catch {
        setApps(snapshot);
      }
    },
    [apps],
  );

  const loadSamples = useCallback(async () => {
    setLoadingSamples(true);
    try {
      for (const s of SAMPLES) {
        const created = await createApp({ ...s, icon: null, color: null });
        setApps((prev) => [...prev, created]);
      }
    } catch {
      // 忽略單筆失敗
    } finally {
      setLoadingSamples(false);
    }
  }, []);

  const submitSheet = useCallback(
    async (values: AppInput) => {
      if (sheet?.mode === "edit" && sheet.app) {
        await handleUpdate(sheet.app.id, values);
      } else {
        await handleAdd(values);
      }
    },
    [sheet, handleAdd, handleUpdate],
  );

  // 登出：清掉 Supabase session，再導回登入頁
  const handleLogout = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
    } catch {
      // 忽略錯誤，仍導向登入頁
    }
    router.replace("/login");
  }, [router]);

  const isEmpty = !loading && apps.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      {/* 頂部毛玻璃列 */}
      <header className="sticky top-0 z-30 -mx-4 mb-2 border-b border-white/30 bg-white/40 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl dark:border-white/5 dark:bg-neutral-950/40">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            工具箱
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="登出"
              title="登出"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-neutral-500 shadow-sm transition active:scale-90 hover:bg-white hover:text-neutral-700 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
            {apps.length > 0 && (
              <button
                type="button"
                onClick={() => setEditMode((v) => !v)}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-95 ${
                  editMode
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "bg-white/70 text-neutral-700 dark:bg-white/10 dark:text-neutral-200"
                }`}
              >
                {editMode ? "完成" : "編輯"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSheet({ mode: "add", app: null })}
              aria-label="新增工具"
              className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/25 transition active:scale-90 hover:bg-blue-500"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
        <SearchBar value={query} onChange={setQuery} />
      </header>

      {/* 內容 */}
      <main className="pb-24 pt-2">
        {loading && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-3 gap-y-5 px-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="aspect-square w-16 animate-pulse rounded-[22%] bg-neutral-300/50 dark:bg-white/10" />
                <div className="h-2.5 w-10 animate-pulse rounded bg-neutral-300/50 dark:bg-white/10" />
              </div>
            ))}
          </div>
        )}

        {loadError && !loading && (
          <div className="mt-16 text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              載入失敗，請確認網路連線與 Supabase 設定。
            </p>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadApps();
              }}
              className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
            >
              重新載入
            </button>
          </div>
        )}

        {!loading && !loadError && isEmpty && (
          <EmptyState
            onAdd={() => setSheet({ mode: "add", app: null })}
            onLoadSamples={loadSamples}
            loadingSamples={loadingSamples}
          />
        )}

        {!loading && !loadError && !isEmpty && (
          <>
            {filtered.length === 0 ? (
              <p className="mt-16 text-center text-sm text-neutral-500 dark:text-neutral-400">
                找不到符合「{query}」的工具
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortableCategoryIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-6">
                    {groups.map((group) => (
                      <SortableSection
                        key={group.key}
                        group={group}
                        showHeadings={showHeadings}
                        editMode={editMode}
                        dndEnabled={dndEnabled}
                        onOpenEditor={(a) => setSheet({ mode: "edit", app: a })}
                        onPeek={(a) => setPeek(a)}
                        onDelete={handleDelete}
                        onRenameCategory={handleRenameCategory}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}
      </main>

      {sheet && (
        <AppSheet
          mode={sheet.mode}
          initial={sheet.app}
          existingCategories={existingCategories}
          onClose={() => setSheet(null)}
          onSubmit={submitSheet}
          onDelete={handleDelete}
        />
      )}

      {peek && <PeekCard app={peek} onClose={() => setPeek(null)} />}
    </div>
  );
}
