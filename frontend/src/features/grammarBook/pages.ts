import type { Chapter, Item, Section } from "../../content/grammarBook/types";

/**
 * 章を読むためのページ割り。導入 → 節ごとのページ(項目は ITEMS_PER_PAGE 個まで)→ まとめ・確認問題。
 * 項目が多い節は、同じ節の中で続きのページになる(part / parts で何ページ目かを示す)。
 */

export const ITEMS_PER_PAGE = 3;

export type Page =
  | { kind: "intro" }
  | { kind: "section"; sectionIndex: number; part: number; parts: number }
  | { kind: "end" };

export function buildPages(chapter: Pick<Chapter, "sections">, perPage = ITEMS_PER_PAGE): Page[] {
  const pages: Page[] = [{ kind: "intro" }];
  chapter.sections.forEach((section, sectionIndex) => {
    const parts = Math.max(1, Math.ceil(section.items.length / perPage));
    for (let part = 0; part < parts; part++) {
      pages.push({ kind: "section", sectionIndex, part, parts });
    }
  });
  pages.push({ kind: "end" });
  return pages;
}

/** 節のページに出す項目(そのページの分だけ) */
export function itemsOnPage(section: Section, page: Extract<Page, { kind: "section" }>, perPage = ITEMS_PER_PAGE): Item[] {
  return section.items.slice(page.part * perPage, (page.part + 1) * perPage);
}

/** その節の最初のページ番号(0 始まり)。節が無ければ -1 */
export function firstPageOfSection(pages: Page[], sectionIndex: number): number {
  return pages.findIndex((p) => p.kind === "section" && p.sectionIndex === sectionIndex);
}

/**
 * 章を開いたときのページ(0 始まり)。
 * 問題の解答後のリンク(該当する節)があれば、その節の最初のページ。無ければ、しおりのページ。どちらも無ければ導入。
 */
export function startPage(pages: Page[], highlightSectionIndex: number | null, bookmarkPage: number | null): number {
  if (highlightSectionIndex !== null) {
    const first = firstPageOfSection(pages, highlightSectionIndex);
    if (first >= 0) return first;
  }
  if (bookmarkPage !== null && bookmarkPage >= 0 && bookmarkPage < pages.length) return bookmarkPage;
  return 0;
}
