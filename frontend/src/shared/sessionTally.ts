/** 1回の練習(「次の問題」を重ねて「終了する」まで)の集計。終了時のまとめに使う */
export interface Tally {
  /** 解いた設問の数 */
  answered: number;
  correct: number;
  /** 解答にかかった秒数の合計(画面を開いて放置した時間は含めない) */
  seconds: number;
}

export const EMPTY_TALLY: Tally = { answered: 0, correct: 0, seconds: 0 };

export function addToTally(tally: Tally, add: { total: number; correct: number; seconds: number }): Tally {
  return {
    answered: tally.answered + add.total,
    correct: tally.correct + add.correct,
    seconds: tally.seconds + Math.max(0, add.seconds),
  };
}

/** 正答率(%、四捨五入)。まだ解いていなければ null */
export function accuracyPercent(tally: Tally): number | null {
  return tally.answered === 0 ? null : Math.round((tally.correct / tally.answered) * 100);
}

export function formatStudyTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest}秒`;
  return rest === 0 ? `${minutes}分` : `${minutes}分${rest}秒`;
}
