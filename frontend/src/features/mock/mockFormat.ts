import type { MockItem } from "../../api/client";

/** リーディングの区切り見出し(Part 5〜7) */
export const PART_TITLES: Record<string, string> = {
  "toeic-part5": "Part 5 短文穴埋め",
  "toeic-part6": "Part 6 長文穴埋め",
  "toeic-part7": "Part 7 読解",
};

/** 解答の記録先を区別するキー(リスニングと読解で ID が衝突しないように feature を付ける) */
export function itemKey(item: Pick<MockItem, "feature" | "id">): string {
  return `${item.feature}:${item.id}`;
}

/** 各問題文・音声の最初の設問番号から1つ前までの設問数(設問番号を通し番号にするため) */
export function numberOffsets(items: MockItem[]): number[] {
  let total = 0;
  return items.map((item) => {
    const start = total;
    total += item.questions.length;
    return start;
  });
}

/** 残り秒数を m:ss で表す */
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
