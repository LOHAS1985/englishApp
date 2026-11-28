/** 文法の教科書の進み具合(読了・確認問題の最高得点)。端末ごとにブラウザへ保存する */

export interface ChapterProgress {
  read?: boolean;
  /** 確認問題の最高得点(正解数)と問題数 */
  quizBest?: number;
  quizTotal?: number;
}

export type Progress = Record<string, ChapterProgress>;

const STORAGE_KEY = "grammarBook.progress";

/** 保存された値が壊れていても、空の進み具合から始める */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const out: Progress = {};
    for (const [id, p] of Object.entries(value as Record<string, unknown>)) {
      if (typeof p !== "object" || p === null) continue;
      const { read, quizBest, quizTotal } = p as Record<string, unknown>;
      out[id] = {
        read: read === true ? true : undefined,
        quizBest: typeof quizBest === "number" ? quizBest : undefined,
        quizTotal: typeof quizTotal === "number" ? quizTotal : undefined,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export function loadProgress(): Progress {
  try {
    return parseProgress(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

function save(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 保存できなくても、この画面の間は反映される
  }
}

export function setRead(chapterId: string, read: boolean): Progress {
  const progress = loadProgress();
  progress[chapterId] = { ...progress[chapterId], read: read || undefined };
  save(progress);
  return progress;
}

/** 確認問題の結果を残す。最高得点(正解の割合)だけを更新する */
export function recordQuiz(chapterId: string, correct: number, total: number): Progress {
  const progress = loadProgress();
  const current = progress[chapterId] ?? {};
  const better =
    current.quizBest === undefined ||
    current.quizTotal === undefined ||
    correct / total > current.quizBest / current.quizTotal;
  if (better) progress[chapterId] = { ...current, quizBest: correct, quizTotal: total };
  save(progress);
  return progress;
}
