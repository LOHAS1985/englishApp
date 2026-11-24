/**
 * ホームに戻るまでに出した問題(機能ごと)。利用者の要望で、ホームに戻るまでは一度出した問題を出し直さない
 * (以前は間違えた問題を約3割の確率で出し直し、直近5問を避けるだけだったので、数問後にまた出ていた)。
 * メモリにだけ持つ(ホームを開くと `resetSeen` で空にする。画面を読み込み直しても空になる)。
 */
const seen = new Map<string, Set<string>>();

/** 出した問題を覚える(先読みした問題も、このあと出すので含める) */
export function markSeen(scope: string, id: string | number) {
  let ids = seen.get(scope);
  if (!ids) {
    ids = new Set();
    seen.set(scope, ids);
  }
  ids.add(String(id));
}

export function seenIn(scope: string): ReadonlySet<string> {
  return seen.get(scope) ?? new Set();
}

/** ホームに戻ったら忘れる(次に問題画面を開いたときは、また全部から出す) */
export function resetSeen() {
  seen.clear();
}

/** ホームに戻るまでに、出せる問題をすべて出したときの文言 */
export const ALL_SEEN_MESSAGE = "この形式の問題は、ホームに戻るまでにすべて出しました。ホームに戻ると、また出題できます。";
