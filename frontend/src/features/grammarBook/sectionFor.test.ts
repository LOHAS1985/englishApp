import { describe, expect, it } from "vitest";
import type { Chapter } from "../../content/grammarBook/types";
import { sectionForPoint } from "./sectionFor";

const section = (id: string, keywords: string[]) => ({ id, title: id, intro: "", keywords, items: [] });
const chapter = {
  id: "relative",
  sections: [
    section("pronoun", ["関係代名詞"]),
    section("adverb", ["関係副詞"]),
    section("what", ["関係代名詞(what)", "関係代名詞 what"]),
    section("none", []),
  ],
} as unknown as Chapter;

describe("sectionForPoint", () => {
  it("point に keywords が含まれる節を選ぶ", () => {
    expect(sectionForPoint(chapter, "関係副詞(where)")).toBe("adverb");
    expect(sectionForPoint(chapter, "関係代名詞(前置詞+which)")).toBe("pronoun");
  });

  it("複数の節に当てはまるときは、一番長い語(より具体的な節)を選ぶ", () => {
    expect(sectionForPoint(chapter, "関係代名詞(what)")).toBe("what");
  });

  it("当てはまる節が無い・point が無いときは null", () => {
    expect(sectionForPoint(chapter, "時制(過去)")).toBeNull();
    expect(sectionForPoint(chapter, null)).toBeNull();
    expect(sectionForPoint(chapter, "")).toBeNull();
  });
});
