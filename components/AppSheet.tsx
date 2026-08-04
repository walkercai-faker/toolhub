"use client";

// 分類與圖示上傳的底部彈窗表單
import { useEffect, useRef, useState } from "react";
import type { App, AppInput } from "@/lib/types";
import { compressImageToDataUrl } from "@/lib/image";
import { isValidUrl, normalizeUrl } from "@/lib/url";
import { gradientFor, initialOf } from "@/lib/gradient";

interface Props {
  mode: "add" | "edit";
  initial?: App | null;
  existingCategories?: string[];
  onClose: () => void;
  onSubmit: (values: AppInput) => Promise<void>;
  onDelete?: (app: App) => void;
}

export default function AppSheet({
  mode,
  initial,
  existingCategories = [],
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [url, setUrl] = useState(() => initial?.url ?? "");
  const [description, setDescription] = useState(() => initial?.description ?? "");
  const [icon, setIcon] = useState<string | null>(() => initial?.icon ?? null);
  const [category, setCategory] = useState(() => initial?.category ?? "");

  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [iconLoading, setIconLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 220);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 重設，讓同一張圖可再次選取
    if (!file) return;
    setIconLoading(true);
    setFormError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setIcon(dataUrl);
    } catch {
      setFormError("圖片處理失敗，請換一張試試");
    } finally {
      setIconLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const u = url.trim();

    const nextErrors: { title?: string; url?: string } = {};
    if (!t) nextErrors.title = "請輸入名稱";
    if (!u) nextErrors.url = "請輸入連結";
    else if (!isValidUrl(u)) nextErrors.url = "連結格式怪怪的，請確認";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit({
        title: t,
        url: normalizeUrl(u),
        description: description.trim(),
        icon,
        color: initial?.color ?? null,
        category: category.trim() || null,
      });
      requestClose();
    } catch {
      setSubmitting(false);
      setFormError("儲存失敗，請稍後再試");
    }
  };

  const previewSeed = initial?.color || title;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-6 ${
        closing ? "opacity-0" : "animate-fade-in opacity-100"
      }`}
      onClick={requestClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/50 bg-neutral-50/95 shadow-2xl backdrop-blur-2xl transition-transform duration-200 dark:border-white/10 dark:bg-neutral-900/95 sm:max-h-[85vh] sm:rounded-3xl sm:border ${
          closing ? "translate-y-full" : "animate-sheet-up"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "新增工具" : "編輯工具"}
      >
        {/* 標題列（固定不捲動） */}
        <div className="shrink-0 px-5 pt-3">
          {/* 抓握條（僅手機顯示） */}
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-700 sm:hidden" />

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {mode === "add" ? "新增工具" : "編輯工具"}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="關閉"
              className="grid h-8 w-8 place-items-center rounded-full bg-neutral-200/80 text-neutral-500 transition active:scale-90 dark:bg-white/10 dark:text-neutral-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 內容區（可捲動，確保送出鈕在任何視窗高度都可觸及） */}
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* 圖示上傳 */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="squircle relative h-16 w-16 shrink-0"
              aria-label="上傳圖示"
            >
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- 使用者上傳的 base64 預覽
                <img src={icon} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white"
                  style={{ backgroundImage: gradientFor(previewSeed) }}
                >
                  {title.trim() ? initialOf(title) : "＋"}
                </span>
              )}
              {iconLoading && (
                <span className="absolute inset-0 grid place-items-center bg-black/40 text-[10px] text-white">
                  處理中…
                </span>
              )}
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="rounded-full bg-neutral-200/90 px-3.5 py-1.5 text-sm font-medium text-neutral-700 transition active:scale-95 dark:bg-white/10 dark:text-neutral-200"
                >
                  {icon ? "更換圖示" : "上傳圖示"}
                </button>
                {icon && (
                  <button
                    type="button"
                    onClick={() => setIcon(null)}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-red-500 transition active:scale-95"
                  >
                    移除
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-neutral-400">
                可不上傳；系統會用漸層底色代替。
              </p>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickFile}
            />
          </div>

          {/* 名稱 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              名稱<span className="text-red-500"> *</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：客服後台"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100 ${
                errors.title
                  ? "border-red-400 focus:ring-red-200"
                  : "border-neutral-200 focus:border-blue-400 focus:ring-blue-100 dark:border-neutral-700 dark:focus:ring-blue-900/40"
              }`}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* 連結 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              連結<span className="text-red-500"> *</span>
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              placeholder="example.com"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition focus:ring-2 dark:bg-neutral-800 dark:text-neutral-100 ${
                errors.url
                  ? "border-red-400 focus:ring-red-200"
                  : "border-neutral-200 focus:border-blue-400 focus:ring-blue-100 dark:border-neutral-700 dark:focus:ring-blue-900/40"
              }`}
            />
            {errors.url && <p className="mt-1 text-xs text-red-500">{errors.url}</p>}
          </div>

          {/* 描述 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="這個工具是做什麼的？（可留空）"
              className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-blue-900/40"
            />
          </div>

          {/* 分類 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              分類
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例如：人資、客服（可留空）"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:focus:ring-blue-900/40"
            />
            {existingCategories.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {existingCategories.map((c) => {
                  const active = category.trim() === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition active:scale-95 ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-200/90 text-neutral-600 dark:bg-white/10 dark:text-neutral-300"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-blue-600 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98] hover:bg-blue-500 disabled:opacity-60"
          >
            {submitting ? "儲存中…" : mode === "add" ? "新增" : "儲存"}
          </button>

          {mode === "edit" && initial && onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete(initial);
                requestClose();
              }}
              className="w-full rounded-2xl py-2.5 text-sm font-medium text-red-500 transition active:scale-[0.98] hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              刪除工具
            </button>
          )}
          </form>
        </div>
      </div>
    </div>
  );
}
