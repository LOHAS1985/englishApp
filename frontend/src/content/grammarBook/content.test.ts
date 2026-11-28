/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chapterOf } from "./chapterOf";
import { CHAPTERS } from "./chapters";
import type { Chapter } from "./types";
import { validateChapter } from "./validate";

/**
 * 文法の教科書の内容(chapters/*.json)の検査。書き方の決まりは docs/grammar-book.md。
 * 1章だけ確かめるには `npx vitest run src/content/grammarBook -t "章 relative"` のように章の ID で絞る。
 */

const modules = import.meta.glob("./chapters/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const chapters = Object.entries(modules).map(([path, data]) => ({
  id: path.replace(/^.*\/(.+)\.json$/, "$1"),
  data,
}));

/** 問題集(バックエンド)の point と、そこから決まる章ごとの point の一覧 */
function bankPointsByChapter(): Map<string, Set<string>> {
  const dir = new URL("../../../../backend/src/main/resources/questions/grammar/", import.meta.url);
  const byChapter = new Map<string, Set<string>>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const questions = JSON.parse(readFileSync(new URL(file, dir), "utf-8")) as { point: string }[];
    for (const q of questions) {
      const chapter = chapterOf(q.point);
      if (!chapter) continue;
      if (!byChapter.has(chapter)) byChapter.set(chapter, new Set());
      byChapter.get(chapter)!.add(q.point);
    }
  }
  return byChapter;
}

describe("文法の教科書の内容", () => {
  describe.each(chapters)("章 $id", ({ id, data }) => {
    it("書き方の決まりを守っている", () => {
      expect(validateChapter(data, id)).toEqual([]);
    });

    it("問題集にある文法項目(point)が、どれかの節の keywords に入っている", () => {
      const points = bankPointsByChapter().get(id) ?? new Set<string>();
      const sections = (data as Chapter).sections;
      const uncovered = [...points].filter((p) => !sections.some((s) => s.keywords.some((k) => p.includes(k))));
      expect(uncovered, "解答後のリンクが節に飛べない項目。該当する節の keywords に、point に含まれる語を足してください").toEqual([]);
    });
  });

  it("書いた章は、すべて目次(chapters.ts)にある章", () => {
    // 書いていない章は「準備中」として出す(GrammarBook の画面)。ここでは、ファイル名と章の ID のずれだけを見る
    const unknown = chapters.map((c) => c.id).filter((id) => !CHAPTERS.some((c) => c.id === id));
    expect(unknown).toEqual([]);
  });

  it("目次の章 ID は重複しない", () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("確認問題の正解の記号が、全体でほぼ均等(各 20〜30%)", () => {
    const all = chapters.flatMap((c) => (c.data as Chapter).quiz);
    if (chapters.length < CHAPTERS.length) return; // 全章がそろうまでは確かめない(書きかけの章があると偏りを判断できない)
    const share = (l: string) => all.filter((q) => q.answer === l).length / all.length;
    for (const l of ["A", "B", "C", "D"]) {
      expect(share(l), `正解が ${l} の割合`).toBeGreaterThanOrEqual(0.2);
      expect(share(l), `正解が ${l} の割合`).toBeLessThanOrEqual(0.3);
    }
  });

  it("確認問題の id が全章で重複しない", () => {
    const ids = chapters.flatMap((c) => (c.data as Chapter).quiz.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
