/**
 * この画面の版。vite.config.ts が、ビルドの時点の値を埋め込む。
 * 版の番号(1.2.0)は package.json の version、commit は git のコミット(短いハッシュ)。
 * 開発サーバーでは、起動した時点のコミットになる(未コミットの変更は含まれない)。
 */
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_COMMIT_DATE__: string;
declare const __APP_BACKEND_COMMIT__: string;

export const FRONTEND_VERSION: string = __APP_VERSION__;
export const FRONTEND_COMMIT: string = __APP_COMMIT__;
export const FRONTEND_COMMIT_DATE: string = __APP_COMMIT_DATE__;
/** この画面をビルドした時点で、最後に backend/ を変えたコミット(サーバーがこれなら同じ版) */
export const FRONTEND_BACKEND_COMMIT: string = __APP_BACKEND_COMMIT__;

/**
 * サーバーがこの画面と別の版か。サーバーの commit(完全なハッシュ)が、画面の HEAD か、
 * 最後に backend/ を変えたコミット(短いハッシュ)のどちらかで始まれば同じ版とみなす
 * (画面だけを変えたコミットでは、バックエンドはデプロイしないため)。
 * 比べられないとき(サーバーの応答が無い・ローカルの開発・画面の commit が不明)は false
 */
export function isServerMismatch(server: string | null, frontendCommits: string[]): boolean {
  const known = frontendCommits.filter((c) => c && c !== "unknown");
  if (server === null || server === "local" || known.length === 0) return false;
  return !known.some((c) => server.startsWith(c));
}

/** 日時を日本時間の「2026/11/22 15:16」にする。空や不正なら空文字 */
export function formatJst(isoDate: string): string {
  const date = new Date(isoDate);
  if (!isoDate || Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}
