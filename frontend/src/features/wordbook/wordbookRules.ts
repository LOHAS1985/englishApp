import type { WordbookColor, WordbookWord } from "../../api/client";

/** 色の表示順と名前。無色は「まだ判定していない」、青は覚えた、黄はあいまい、赤は苦手 */
export const COLOR_ORDER: WordbookColor[] = ["NONE", "RED", "YELLOW", "BLUE"];

export const COLOR_LABELS: Record<WordbookColor, string> = {
  NONE: "無色",
  BLUE: "青(覚えた)",
  YELLOW: "黄(あいまい)",
  RED: "赤(苦手)",
};

/** 直近に出した語の数。出題はこれと同じ語を避ける(サーバーの exclude に渡す) */
export const RECENT_LIMIT = 5;

/** 選んだ文字列から前後の記号を外して英単語にする。英単語1語でなければ null */
export function toHeadword(selected: string): string | null {
  const word = selected.trim().replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, "");
  return /^[A-Za-z][A-Za-z'-]*$/.test(word) ? word : null;
}

/** 直近の語の ID を先頭に足し、RECENT_LIMIT 件までに切り詰める */
export function pushRecent(recent: number[], id: number): number[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, RECENT_LIMIT);
}

const SENTENCE_END = /[.!?](?=\s|$)|\n/;

/**
 * text の [start, end) を含む文を返す。文の区切りは「. ! ?」の後の空白と改行。
 * 読解から単語を登録するとき、その語が使われている文を例文にするために使う。
 */
export function sentenceAround(text: string, start: number, end: number): string {
  const before = text.slice(0, start);
  let begin = 0;
  const boundary = /[.!?](?=\s)|\n/g;
  for (let m = boundary.exec(before); m !== null; m = boundary.exec(before)) {
    begin = m.index + m[0].length;
  }
  const after = text.slice(end);
  const stop = after.search(SENTENCE_END);
  const finish = stop === -1 ? text.length : end + stop + (after[stop] === "\n" ? 0 : 1);
  return text.slice(begin, finish).trim();
}

/** 一覧の絞り込み。色のほか、今日の復習(復習日が来た語)と未学習(まだ一度も出していない語) */
export type WordFilter = WordbookColor | "ALL" | "DUE" | "UNSEEN";

export const FILTER_LABELS: Record<Exclude<WordFilter, WordbookColor>, string> = {
  ALL: "すべて",
  DUE: "今日の復習",
  UNSEEN: "未学習",
};

/** 一覧の並べ替え */
export type WordSort = "ADDED" | "ALPHABET" | "COLOR" | "ACCURACY" | "DUE";

export const SORT_LABELS: Record<WordSort, string> = {
  ADDED: "登録順",
  ALPHABET: "ABC順",
  COLOR: "色順(赤→黄→無色→青)",
  ACCURACY: "正答率が低い順",
  DUE: "復習日が近い順",
};

/** 一覧は最初にこの数だけ出し、「もっと見る」で足す(500語を一度に描画しない) */
export const PAGE_SIZE = 50;

const COLOR_RANK: Record<WordbookColor, number> = { RED: 0, YELLOW: 1, NONE: 2, BLUE: 3 };

/** 今日の日付(日本時間。YYYY-MM-DD)。復習日が来ているかの判定に使う */
export function todayJst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);
}

export function matchesFilter(word: WordbookWord, filter: WordFilter, today: string): boolean {
  switch (filter) {
    case "ALL":
      return true;
    case "DUE":
      return word.nextDueDate !== null && word.nextDueDate <= today;
    case "UNSEEN":
      return word.timesAsked === 0;
    default:
      return word.color === filter;
  }
}

/** 語・訳・例文(英語・日本語)のどれかに含まれていれば true。大文字小文字は問わない */
export function matchesQuery(word: WordbookWord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  return [word.word, word.meaningJa, word.exampleEn, word.exampleJa].some((text) =>
    (text ?? "").toLowerCase().includes(q),
  );
}

/** 正答率(0〜1)。まだ出していない語は null */
const accuracyOf = (w: WordbookWord) => (w.timesAsked === 0 ? null : w.timesCorrect / w.timesAsked);

/** 並べ替えた新しい配列を返す。同じ順位は登録順(元の並び)のまま */
export function sortWords(words: WordbookWord[], sort: WordSort): WordbookWord[] {
  const indexed = words.map((word, index) => ({ word, index }));
  const compare = (a: WordbookWord, b: WordbookWord): number => {
    switch (sort) {
      case "ALPHABET":
        return a.word.localeCompare(b.word);
      case "COLOR":
        return COLOR_RANK[a.color] - COLOR_RANK[b.color];
      case "ACCURACY": {
        // 出した語を正答率の低い順に、まだ出していない語は最後に
        const x = accuracyOf(a);
        const y = accuracyOf(b);
        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
        return x - y || b.timesAsked - a.timesAsked;
      }
      case "DUE": {
        // 復習日が近い順。復習日のない語(まだ出していない語)は最後に
        if (a.nextDueDate === b.nextDueDate) return 0;
        if (a.nextDueDate === null) return 1;
        if (b.nextDueDate === null) return -1;
        return a.nextDueDate < b.nextDueDate ? -1 : 1;
      }
      default:
        return 0;
    }
  };
  return indexed.sort((a, b) => compare(a.word, b.word) || a.index - b.index).map((x) => x.word);
}

/** 復習日の表示(例: 今日・明日・11/25)。復習日が無ければ null */
export function dueLabel(nextDueDate: string | null, today: string): string | null {
  if (nextDueDate === null) return null;
  if (nextDueDate <= today) return "今日";
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (nextDueDate === tomorrow.toISOString().slice(0, 10)) return "明日";
  const [, month, day] = nextDueDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}
