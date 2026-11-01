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

// 端末の鍵。登録済みの端末(最大3台)だけが API を使える。初回に合言葉で登録するとサーバーが発行し、
// この端末のブラウザに保存する(ブラウザのデータを消すと登録し直しになる)
const DEVICE_TOKEN_STORAGE = "englishApp.deviceToken";
/** サーバーが「この端末は登録されていない」(401)と返したときに投げるイベント。DeviceGate が登録画面を出す */
export const DEVICE_REGISTRATION_REQUIRED_EVENT = "englishApp:device-registration-required";

function loadDeviceToken() {
  try {
    return localStorage.getItem(DEVICE_TOKEN_STORAGE) ?? "";
  } catch {
    return "";
  }
}

/** 保存できたら true。保存できない環境(プライベートモードなど)では登録しても使えないので、画面側で知らせる */
export function saveDeviceToken(token: string) {
  try {
    localStorage.setItem(DEVICE_TOKEN_STORAGE, token);
    // 以前の簡易保護(合言葉をそのまま送る方式)で保存した値は使わないので消す
    localStorage.removeItem("englishApp.appKey");
    return localStorage.getItem(DEVICE_TOKEN_STORAGE) === token;
  } catch {
    return false;
  }
}

export function hasDeviceToken() {
  return loadDeviceToken() !== "";
}

export async function send(path: string, fallbackError: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = loadDeviceToken();
  if (token) headers.set("X-Device-Token", token);
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    window.dispatchEvent(new Event(DEVICE_REGISTRATION_REQUIRED_EVENT));
    throw new HttpError(401, await errorMessage(res, "この端末は登録されていません"));
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
