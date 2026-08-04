"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { App, AppInput } from "@/lib/types";
import AppIcon from "./AppIcon";
import AppSheet from "./AppSheet";
import PeekCard from "./PeekCard";
import SearchBar from "./SearchBar";
import EmptyState from "./EmptyState";

interface SheetState {
  mode: "add" | "edit";
  app: App | null;
}

const SAMPLES: Omit<AppInput, "icon" | "color">[] = [
  { title: "Google", url: "https://www.google.com", description: "搜尋引擎" },
  { title: "Gmail", url: "https://mail.google.com", description: "電子郵件" },
  { title: "YouTube", url: "https://www.youtube.com", description: "影音平台" },
  { title: "Notion", url: "https://www.notion.so", description: "筆記與文件協作" },
];

async function postApp(values: AppInput): Promise<App> {
  const res = await fetch("/api/apps", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("建立失敗");
  return res.json();
}

export default function ToolHub() {
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
      const res = await fetch("/api/apps", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setApps(await res.json());
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
        const res = await fetch("/api/apps", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data: App[] = await res.json();
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
      key: key === "" ? "__uncategorized__" : key,
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
        const created = await postApp(values);
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
        const res = await fetch(`/api/apps/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!res.ok) throw new Error();
        const updated: App = await res.json();
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
        const res = await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
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
        const created = await postApp({ ...s, icon: null, color: null });
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
              載入失敗，請確認伺服器是否啟動。
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
              <div className="space-y-6">
                {groups.map((group) => (
                  <section key={group.key}>
                    {showHeadings && (
                      <h2 className="mb-3 px-1 text-[22px] font-bold leading-tight text-neutral-900 dark:text-white">
                        {group.isUncategorized ? "未分類" : group.key}
                      </h2>
                    )}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-3 gap-y-5 px-1">
                      {group.apps.map((app, index) => (
                        <AppIcon
                          key={app.id}
                          app={app}
                          index={index}
                          editMode={editMode}
                          onOpenEditor={(a) => setSheet({ mode: "edit", app: a })}
                          onPeek={(a) => setPeek(a)}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
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
