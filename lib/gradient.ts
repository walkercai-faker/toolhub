/** 由字串產生穩定 hash（供漸層色與首字使用）。 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // 轉成 32-bit 整數
  }
  return Math.abs(hash);
}

/**
 * 依 seed（color 或 title）產生漂亮且穩定的漸層底色。
 * 同一個 seed 永遠得到同一組顏色。
 */
export function gradientFor(seed: string): string {
  const hash = hashString(seed || "toolhub");
  const hue1 = hash % 360;
  const hue2 = (hue1 + 35 + (hash % 50)) % 360;
  return `linear-gradient(140deg, hsl(${hue1} 82% 63%), hsl(${hue2} 76% 48%))`;
}

/** 取工具名稱的第一個字（正確處理 emoji 與中日韓文字）。 */
export function initialOf(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "?";
  const first = Array.from(trimmed)[0];
  return first.toUpperCase();
}
