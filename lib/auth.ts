/**
 * 整站共用密碼登入的核心工具。
 *
 * 全程使用 Web Crypto（globalThis.crypto.subtle）與 btoa/atob，
 * 不碰 Node-only API，因此可同時被：
 *   - proxy.ts（Next.js 16 的站台守門，預設 Node.js runtime，也相容 edge）
 *   - app/api/login、app/api/logout（route handler）
 * 共用，不需重複實作或擔心 runtime 差異。
 */

/** session cookie 名稱 */
export const SESSION_COOKIE = "th_session";

/** session 有效期：30 天（秒） */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** cookie 內簽章 payload 的結構 */
export interface SessionPayload {
  /** 登入帳號 */
  u: string;
  /** 到期時間（unix 秒） */
  exp: number;
}

const encoder = new TextEncoder();

/** 檢查三個必要環境變數是否都有設；缺任一則視為未設定，登入一律拒絕 */
export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.APP_USERNAME &&
      process.env.APP_PASSWORD &&
      process.env.AUTH_SECRET,
  );
}

/** Uint8Array → base64url（去掉 padding，可安全塞進 cookie） */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * base64url → Uint8Array（格式錯誤會由 atob 丟例外，交給呼叫端 try/catch）。
 * 明確標註 `Uint8Array<ArrayBuffer>`：內部以 `new Uint8Array(length)` 配置獨立 buffer，
 * 才能滿足 crypto.subtle.verify 對 BufferSource（ArrayBufferView<ArrayBuffer>）的型別要求。
 */
function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  let base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 2) base64 += "==";
  else if (pad === 3) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** 以 AUTH_SECRET 匯入 HMAC-SHA256 金鑰 */
async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * 簽發 session：回傳 `base64url(payload).base64url(signature)`。
 * signature = HMAC-SHA256(base64url(payload), AUTH_SECRET)。
 * 直接對「已編碼的 payload 字串」簽章，驗證時重算同一份字串即可，避免序列化歧義。
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET 未設定，無法簽發 session");

  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

/**
 * 驗證 session cookie：驗簽章（HMAC 常數時間比較）＋檢查是否過期。
 * 通過回傳 payload，否則回傳 null。任何解析錯誤都當作驗證失敗。
 */
export async function verifySession(
  cookieValue: string | undefined | null,
): Promise<SessionPayload | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || !cookieValue) return null;

  const dotIndex = cookieValue.indexOf(".");
  if (dotIndex <= 0 || dotIndex === cookieValue.length - 1) return null;

  const payloadB64 = cookieValue.slice(0, dotIndex);
  const sigB64 = cookieValue.slice(dotIndex + 1);

  try {
    const key = await importKey(secret);
    const providedSig = fromBase64Url(sigB64);
    // crypto.subtle.verify 內部為常數時間比較，可抵抗 timing attack
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      providedSig,
      encoder.encode(payloadB64),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadB64)),
    ) as SessionPayload;

    if (typeof payload.u !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null; // 已過期

    return payload;
  } catch {
    return null;
  }
}

/**
 * 時間安全字串比較（避免 timing attack）。
 * 手法：用「隨機金鑰」對兩字串各做一次 HMAC，再比對固定長度（32 bytes）摘要。
 * 因為摘要長度固定、且 verify 為常數時間，比較耗時與輸入的長度／內容皆無關，
 * 同時避免直接比較明文長度而洩漏資訊。
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const macA = await crypto.subtle.sign("HMAC", key, encoder.encode(a));
  return crypto.subtle.verify("HMAC", key, macA, encoder.encode(b));
}
