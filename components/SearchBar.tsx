"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        inputMode="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="搜尋工具"
        aria-label="搜尋工具"
        className="w-full rounded-2xl border border-white/40 bg-white/55 py-2.5 pl-10 pr-4 text-[15px] text-neutral-800 shadow-sm outline-none backdrop-blur-xl transition placeholder:text-neutral-400 focus:border-white/70 focus:bg-white/75 dark:border-white/10 dark:bg-white/10 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-white/15"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="清除搜尋"
          className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-neutral-300/70 text-neutral-600 transition hover:bg-neutral-400/70 dark:bg-white/15 dark:text-neutral-300"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
