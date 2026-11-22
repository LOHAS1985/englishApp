/**
 * この画面を作ったときの版(git のコミット)。vite.config.ts が、ビルドの時点の値を埋め込む。
 * 開発サーバーでは、起動した時点のコミットになる(未コミットの変更は含まれない)。
 */
declare const __APP_COMMIT__: string;
declare const __APP_COMMIT_DATE__: string;

export const FRONTEND_COMMIT: string = __APP_COMMIT__;
export const FRONTEND_COMMIT_DATE: string = __APP_COMMIT_DATE__;

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
