/**
 * デプロイ後に、古い画面(開いたままの PWA など)がまだ開いていない形式の問題集(chunk)を読もうとすると、
 * ファイル名のハッシュが変わっていて取得に失敗する。画面を読み込み直せば最新になるので、1回だけ自動で読み込み直す。
 */

const RELOAD_KEY = "englishApp.staleChunkReloadAt";
/** この時間内に読み込み直していたら、もう読み込み直さない(本当に取得できないときに繰り返さないため) */
const RELOAD_INTERVAL_MS = 60_000;

/** 動的 import の失敗か(ブラウザごとにメッセージが違う) */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(
    message,
  );
}

/**
 * 画面を読み込み直す。直近 1 分以内に読み込み直していた・オフラインのときは何もしない。
 * @returns 読み込み直したら true
 */
export function reloadForStaleChunk(
  now: number = Date.now(),
  storage: Pick<Storage, "getItem" | "setItem"> = sessionStorage,
  reload: () => void = () => window.location.reload(),
  online: boolean = navigator.onLine,
): boolean {
  if (!online) return false;
  try {
    const last = Number(storage.getItem(RELOAD_KEY));
    if (last && now - last < RELOAD_INTERVAL_MS) return false;
    storage.setItem(RELOAD_KEY, String(now));
  } catch {
    // 記録できない環境では、繰り返さないよう読み込み直さない
    return false;
  }
  reload();
  return true;
}
