/**
 * 入力途中の下書き(ライティングの答案、スピーキングの文字起こし)をブラウザに保存する。
 * タブを閉じる・リロードしても、次に開いたときに同じお題で続きから書ける。
 * 機能ごとに1つだけ持つ(新しいお題に進んだら置き換える)。
 */

export interface Draft<T> {
  /** お題・セットの ID。復元するときは同じお題を出し直す */
  id: string;
  value: T;
  savedAt: number;
}

/** 古い下書きは捨てる(何日も前の途中のお題を急に出さないため) */
export const DRAFT_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const keyOf = (feature: string) => `draft:${feature}`;

/** 保存された文字列から下書きを読む。壊れている・古いときは null */
export function parseDraft<T>(raw: string | null, now: number): Draft<T> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { id, value, savedAt } = parsed as Record<string, unknown>;
    if (typeof id !== "string" || id === "" || typeof savedAt !== "number" || value === undefined) return null;
    if (now - savedAt > DRAFT_MAX_AGE_MS) return null;
    return { id, value: value as T, savedAt };
  } catch {
    return null;
  }
}

export function loadDraft<T>(feature: string): Draft<T> | null {
  try {
    return parseDraft<T>(localStorage.getItem(keyOf(feature)), Date.now());
  } catch {
    return null;
  }
}

export function saveDraft<T>(feature: string, id: string, value: T) {
  try {
    const draft: Draft<T> = { id, value, savedAt: Date.now() };
    localStorage.setItem(keyOf(feature), JSON.stringify(draft));
  } catch {
    // 保存できなくても、入力そのものは続けられる
  }
}

export function clearDraft(feature: string) {
  try {
    localStorage.removeItem(keyOf(feature));
  } catch {
    // 消せなくても支障はない(古い下書きは期限で捨てられる)
  }
}
