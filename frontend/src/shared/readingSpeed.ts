/**
 * 読解速度(語/分)の計算。サーバーの ReadingSpeedService と同じ数え方・式にそろえる
 * (画面で出す値と、あとで記録される値が食い違わないようにするため)。
 */

/** これより短い計測は押し忘れや誤操作とみなし、記録しない */
export const MIN_READING_SECONDS = 10;
/** これより長い計測は画面を放置したとみなし、記録しない */
export const MAX_READING_SECONDS = 30 * 60;

/** 本文の語数(空白で区切った数)。Part 6 の空所 [1] なども1語として数える */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/** 語/分(四捨五入)。秒数が 0 以下なら 0 */
export function wordsPerMinute(words: number, seconds: number): number {
  return seconds > 0 ? Math.round(words / (seconds / 60)) : 0;
}

export function isMeasurableReadingTime(seconds: number): boolean {
  return seconds >= MIN_READING_SECONDS && seconds <= MAX_READING_SECONDS;
}
