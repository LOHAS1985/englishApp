import type { WordbookColor } from "../../api/client";

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
