import { describe, expect, it } from "vitest";
import type { Item, Section } from "../../content/grammarBook/types";
import { buildPages, firstPageOfSection, itemsOnPage, startPage } from "./pages";

const item = (n: number): Item => ({ heading: `項目${n}`, explanation: "", examples: [] });
const section = (id: string, items: number): Section => ({
  id,
  title: id,
  intro: "",
  keywords: [],
  items: Array.from({ length: items }, (_, i) => item(i + 1)),
});

// 節1: 4項目(3つ + 1つ で2ページ)、節2: 1項目(1ページ)、節3: 0項目(1ページ)
const chapter = { sections: [section("a", 4), section("b", 1), section("c", 0)] };

describe("buildPages", () => {
  it("導入 → 節ごとのページ(項目は3つまで)→ まとめ・確認問題 の順", () => {
    expect(buildPages(chapter)).toEqual([
      { kind: "intro" },
      { kind: "section", sectionIndex: 0, part: 0, parts: 2 },
      { kind: "section", sectionIndex: 0, part: 1, parts: 2 },
      { kind: "section", sectionIndex: 1, part: 0, parts: 1 },
      { kind: "section", sectionIndex: 2, part: 0, parts: 1 },
      { kind: "end" },
    ]);
  });

  it("ページあたりの項目数を変えられる", () => {
    const pages = buildPages(chapter, 2);
    expect(pages.filter((p) => p.kind === "section" && p.sectionIndex === 0)).toHaveLength(2);
  });
});

describe("itemsOnPage", () => {
  it("そのページの項目だけを返す", () => {
    const pages = buildPages(chapter);
    const first = pages[1] as Extract<(typeof pages)[number], { kind: "section" }>;
    const second = pages[2] as Extract<(typeof pages)[number], { kind: "section" }>;
    expect(itemsOnPage(chapter.sections[0], first).map((i) => i.heading)).toEqual(["項目1", "項目2", "項目3"]);
    expect(itemsOnPage(chapter.sections[0], second).map((i) => i.heading)).toEqual(["項目4"]);
  });
});

describe("firstPageOfSection / startPage", () => {
  const pages = buildPages(chapter);

  it("節の最初のページを返す", () => {
    expect(firstPageOfSection(pages, 1)).toBe(3);
    expect(firstPageOfSection(pages, 9)).toBe(-1);
  });

  it("解答後のリンク(節)があれば、その節から開く", () => {
    expect(startPage(pages, 1, 2)).toBe(3);
  });

  it("リンクが無ければ、しおりのページから開く", () => {
    expect(startPage(pages, null, 2)).toBe(2);
  });

  it("どちらも無ければ導入から開く。しおりが範囲外なら導入", () => {
    expect(startPage(pages, null, null)).toBe(0);
    expect(startPage(pages, null, 99)).toBe(0);
  });
});
