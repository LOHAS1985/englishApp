import type { Chapter } from "../../content/grammarBook/types";

/**
 * 問題の point(例:「関係代名詞(前置詞+which)」)に対応する節の ID。
 * keywords が point に含まれる節のうち、一番長い語に当てはまる節(より具体的な節)を選ぶ。無ければ null(章の先頭を開く)。
 */
export function sectionForPoint(chapter: Chapter, point: string | null | undefined): string | null {
  if (!point) return null;
  let best: { id: string; length: number } | null = null;
  for (const section of chapter.sections) {
    for (const keyword of section.keywords) {
      if (point.includes(keyword) && (best === null || keyword.length > best.length)) {
        best = { id: section.id, length: keyword.length };
      }
    }
  }
  return best?.id ?? null;
}
