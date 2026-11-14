/**
 * 出題の選び方。サーバーの QuestionPicker / QuestionSelector / Difficulty.target を画面側に移植したもの
 * (サーバーの起動を待たずに出題するため)。規則を変えるときは両方を揃える。
 * - 一巡するまで重複なし(解答回数が最も少ない問題から選ぶ)
 * - 最後に間違えた問題を約3割の確率で出し直す
 * - 直近に解いた問題と、表示中の問題(exclude)は続けて出さない
 * - 難易度の目標があれば、未出題の候補のうち目標に最も近い難易度から選ぶ
 */

/** 解答履歴1行(設問ごと)。correct は正誤のないものでは null */
export interface AnswerRow {
  itemId: string;
  questionNo: number;
  correct: boolean | null;
}

interface Attempt {
  itemId: string;
  correct: boolean | null;
}

const REVIEW_RATE = 0.3;
const RECENT_LIMIT = 5;
const RECENT_ANSWERS = 30;
const MIN_ANSWERS = 8;
const HARD_FROM = 0.85;
const BASIC_BELOW = 0.6;
const MAX_LEVEL = 5;

/**
 * 設問ごとの履歴(新しい順)を1回分の解答にまとめる。セット問題は設問1から順に保存されるので、
 * 新しい順に読んで設問1の行で区切り、全問正解なら正解とする。
 */
export function attemptsFromRows(rowsNewestFirst: AnswerRow[]): Attempt[] {
  const attempts: Attempt[] = [];
  let allCorrect: boolean | null = null;
  for (const r of rowsNewestFirst) {
    if (r.correct !== null) allCorrect = (allCorrect === null || allCorrect) && r.correct;
    if (r.questionNo === 1) {
      attempts.push({ itemId: r.itemId, correct: allCorrect });
      allCorrect = null;
    }
  }
  return attempts;
}

/**
 * 直近に解いた問題の平均の難易度を基準に、正答率で1段ずつ上げ下げして中心に出す難易度を決める
 * (85% 以上なら1つ上、60% 未満なら1つ下、その間なら同じ。1〜5)。解答が少なければ null
 */
export function difficultyTarget(
  rowsNewestFirst: AnswerRow[],
  candidates: Set<string>,
  difficulty: (id: string) => number,
): number | null {
  const recent = rowsNewestFirst
    .filter((r) => r.correct !== null && candidates.has(r.itemId))
    .slice(0, RECENT_ANSWERS);
  if (recent.length < MIN_ANSWERS) return null;
  const rate = recent.filter((r) => r.correct).length / recent.length;
  const base = Math.round(recent.reduce((sum, r) => sum + difficulty(r.itemId), 0) / recent.length);
  const step = rate >= HARD_FROM ? 1 : rate < BASIC_BELOW ? -1 : 0;
  return Math.max(1, Math.min(MAX_LEVEL, base + step));
}

function leastAnswered(candidates: string[], counts: Map<string, number>, blocked: Set<string>) {
  let min = Infinity;
  let pool: string[] = [];
  for (const id of candidates) {
    if (blocked.has(id)) continue;
    const c = counts.get(id) ?? 0;
    if (c < min) {
      min = c;
      pool = [];
    }
    if (c === min) pool.push(id);
  }
  return pool;
}

const randomOf = <T,>(list: T[], random: () => number) => list[Math.floor(random() * list.length)];

export function pick(
  candidates: string[],
  attemptsNewestFirst: Attempt[],
  exclude: string | null | undefined,
  difficulty?: (id: string) => number,
  target?: number | null,
  random: () => number = Math.random,
): string {
  if (candidates.length === 0) throw new Error("問題が登録されていません");
  const candidateSet = new Set(candidates);
  const counts = new Map<string, number>();
  const latest = new Map<string, boolean | null>();
  const recent = new Set<string>();
  const recentLimit = Math.min(RECENT_LIMIT, Math.floor(candidates.length / 3));
  for (const a of attemptsNewestFirst) {
    if (!candidateSet.has(a.itemId)) continue;
    counts.set(a.itemId, (counts.get(a.itemId) ?? 0) + 1);
    if (!latest.has(a.itemId)) latest.set(a.itemId, a.correct);
    if (recent.size < recentLimit) recent.add(a.itemId);
  }

  const blocked = new Set(recent);
  if (exclude) blocked.add(exclude);

  const review = candidates.filter((id) => latest.get(id) === false && !blocked.has(id));
  if (review.length > 0 && random() < REVIEW_RATE) return randomOf(review, random);

  let pool = leastAnswered(candidates, counts, blocked);
  if (pool.length === 0) pool = leastAnswered(candidates, counts, new Set(exclude ? [exclude] : []));
  if (pool.length === 0) pool = candidates;
  if (difficulty && target != null) {
    const best = Math.min(...pool.map((id) => Math.abs(difficulty(id) - target)));
    pool = pool.filter((id) => Math.abs(difficulty(id) - target) === best);
  }
  return randomOf(pool, random);
}
