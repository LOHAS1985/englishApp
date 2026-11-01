export const API_BASE = import.meta.env.VITE_API_BASE_URL;

/** サーバーが {"error": "..."} を返していればその文言を、無ければ既定の文言を使う */
export async function errorMessage(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

/** サーバーがエラーを返した(通信自体は成功した)。送信待ちの列で、再送するかどうかの判断に使う */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// 簡易アクセス保護の合言葉(サーバーの環境変数 APP_ACCESS_KEY と同じ値)。この端末のブラウザに保存する
const APP_KEY_STORAGE = "englishApp.appKey";
/** サーバーが合言葉を求めた(401)ときに投げるイベント。AppKeyGate が入力画面を出す */
export const APP_KEY_REQUIRED_EVENT = "englishApp:app-key-required";

function loadAppKey() {
  try {
    return localStorage.getItem(APP_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveAppKey(key: string) {
  try {
    localStorage.setItem(APP_KEY_STORAGE, key);
  } catch {
    // プライベートモードなどで保存できない場合は、この画面を開いている間だけ使えない(再入力になる)
  }
}

export async function send(path: string, fallbackError: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const appKey = loadAppKey();
  if (appKey) headers.set("X-App-Key", appKey);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    window.dispatchEvent(new Event(APP_KEY_REQUIRED_EVENT));
    throw new HttpError(401, await errorMessage(res, "合言葉を入力してください"));
  }
  if (!res.ok) throw new HttpError(res.status, await errorMessage(res, fallbackError));
  return res;
}

export async function getJson<T>(path: string, fallbackError: string, init?: RequestInit) {
  const res = await send(path, fallbackError, init);
  return res.json() as Promise<T>;
}

export function jsonBody(method: "POST" | "PUT", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export async function postJson<T>(path: string, body: unknown, fallbackError: string) {
  return getJson<T>(path, fallbackError, jsonBody("POST", body));
}
