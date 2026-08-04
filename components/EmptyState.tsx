"use client";

interface Props {
  onAdd: () => void;
  onLoadSamples: () => void;
  loadingSamples: boolean;
}

export default function EmptyState({ onAdd, onLoadSamples, loadingSamples }: Props) {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center px-6 text-center">
      <div className="squircle grid h-20 w-20 place-items-center bg-gradient-to-br from-blue-400 to-indigo-500 text-4xl">
        🧰
      </div>
      <h2 className="mt-5 text-xl font-semibold text-neutral-800 dark:text-neutral-100">
        還沒有任何工具
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
        把常用的網站與後台收整成一格格 App，<br />
        點一下就能開，長按看說明。
      </p>
      <div className="mt-6 flex w-full flex-col gap-2.5">
        <button
          type="button"
          onClick={onAdd}
          className="w-full rounded-2xl bg-blue-600 py-3 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition active:scale-[0.98] hover:bg-blue-500"
        >
          新增第一個工具
        </button>
        <button
          type="button"
          onClick={onLoadSamples}
          disabled={loadingSamples}
          className="w-full rounded-2xl border border-neutral-200 bg-white/70 py-3 text-[15px] font-medium text-neutral-700 backdrop-blur transition active:scale-[0.98] hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200"
        >
          {loadingSamples ? "載入中…" : "載入範例"}
        </button>
      </div>
    </div>
  );
}
