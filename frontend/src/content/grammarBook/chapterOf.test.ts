/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chapterOf, chapterOfCategory } from "./chapterOf";
import { CHAPTERS } from "./chapters";
import pointRules from "./pointRules.json";

const bankDir = new URL("../../../../backend/src/main/resources/questions/grammar/", import.meta.url);
const bankPoints = readdirSync(bankDir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(new URL(f, bankDir), "utf-8")) as { point: string }[])
  .map((q) => q.point);

describe("問題の point から教科書の章を決める", () => {
  it("規則の章が、章の一覧にある", () => {
    for (const r of pointRules.rules) {
      if (r.chapter !== null) expect(CHAPTERS.map((c) => c.id), r.keyword).toContain(r.chapter);
    }
  });

  it("問題集の全問が、どれかの規則に当てはまる(新しい point を足したら規則も足す)", () => {
    const unmatched = [...new Set(bankPoints)].filter((p) => !pointRules.rules.some((r) => p.includes(r.keyword)));
    expect(unmatched).toEqual([]);
  });

  it("代表的な point の章", () => {
    expect(chapterOf("関係代名詞(前置詞+which)")).toBe("relative");
    expect(chapterOf("品詞(副詞)")).toBe("parts-of-speech");
    expect(chapterOf("時制(過去完了)")).toBe("tense");
    expect(chapterOf("仮定法過去完了(倒置)")).toBe("mood");
    expect(chapterOf("前置詞と接続詞")).toBe("conjunction");
    expect(chapterOf("動詞の形(主語と動詞の一致)")).toBe("agreement");
    expect(chapterOf("動詞の形(受動態)")).toBe("voice");
  });

  it("語彙の問題や point が無い問題は、章を持たない", () => {
    expect(chapterOf("語彙(動詞)")).toBeNull();
    expect(chapterOf("名詞(コロケーション at short notice)")).toBeNull();
    expect(chapterOf(undefined)).toBeNull();
    expect(chapterOf("")).toBeNull();
  });

  it("弱点分析の分野から章を引ける", () => {
    expect(chapterOfCategory("関係詞")).toBe("relative");
    expect(chapterOfCategory("語彙・コロケーション")).toBeNull();
    expect(chapterOfCategory("その他")).toBeNull();
  });
});
