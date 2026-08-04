/** 若使用者沒打 protocol，補上 https://。 */
export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

/** 簡單驗證 url 是否合法（會先 normalize）。 */
export function isValidUrl(input: string): boolean {
  const value = normalizeUrl(input);
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.hostname.includes(".");
  } catch {
    return false;
  }
}
