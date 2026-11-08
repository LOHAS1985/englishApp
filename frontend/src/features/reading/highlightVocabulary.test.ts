import { describe, expect, it } from "vitest";
import type { VocabularyItem } from "../../api/client";
import { buildHighlightSegments } from "./highlightVocabulary";

const vocab = (word: string): VocabularyItem => ({ word, meaning: `${word}の意味`, example: "" });

/** 語彙が当たった部分の文字列だけを、出現順に取り出す */
function highlightedTexts(segments: ReturnType<typeof buildHighlightSegments>) {
  return segments.filter((s) => s.vocab !== null).map((s) => s.words.map((w) => w.text).join(""));
}

describe("buildHighlightSegments", () => {
  it("語彙が無ければ本文全体を1つの通常の区間にする", () => {
    const segments = buildHighlightSegments("Hello world.", []);
    expect(segments).toHaveLength(1);
    expect(segments[0].vocab).toBeNull();
    expect(segments[0].words).toEqual([{ text: "Hello world.", isWord: false }]);
  });

  it("大文字小文字を区別せず当て、前後の通常の文字はそのまま残す", () => {
    const segments = buildHighlightSegments("The Cat sat.", [vocab("cat")]);
    expect(segments.map((s) => s.vocab?.word ?? null)).toEqual([null, "cat", null]);
    expect(segments[0].words).toEqual([{ text: "The ", isWord: false }]);
    expect(segments[1].words).toEqual([{ text: "Cat", isWord: true }]);
    expect(segments[2].words).toEqual([{ text: " sat.", isWord: false }]);
  });

  it("複数語の語句は空白を区切りにして、単語ごとの印を付ける", () => {
    const segments = buildHighlightSegments("They ran out fast.", [vocab("ran out")]);
    const match = segments[1];
    expect(match.vocab?.word).toBe("ran out");
    expect(match.words).toEqual([
      { text: "ran", isWord: true },
      { text: " ", isWord: false },
      { text: "out", isWord: true },
    ]);
  });

  it("長い語句が優先される(run out は run より先に当たる)", () => {
    const segments = buildHighlightSegments("run out", [vocab("run"), vocab("run out")]);
    expect(highlightedTexts(segments)).toEqual(["run out"]);
  });

  it("同じ語彙は最初の1回だけ当て、2回目以降は通常の文字として残す", () => {
    const segments = buildHighlightSegments("cat and cat", [vocab("cat")]);
    expect(highlightedTexts(segments)).toEqual(["cat"]);
    // 2回目の cat を含む残りは通常の区間として連結される
    const plain = segments
      .filter((s) => s.vocab === null)
      .map((s) => s.words.map((w) => w.text).join(""))
      .join("");
    expect(plain).toBe(" and cat");
  });

  it("正規表現の記号を含む語彙も文字どおりに当てる", () => {
    const segments = buildHighlightSegments("See e.g. this and eXg here.", [vocab("e.g.")]);
    expect(highlightedTexts(segments)).toEqual(["e.g."]);
  });

  it("本文が空なら区間を作らない", () => {
    expect(buildHighlightSegments("", [vocab("cat")])).toEqual([]);
  });

  // 既知の疑い: 語彙を部分一致で当てているため、単語の途中(accurate の rate)も色が付く。
  // 語彙は本文中の表記どおりに渡されるので、単語の前後が文字でないときだけ当てるのが正しい動作。
  it("単語の途中の一致には当てない(rate は accurate に当てない)", () => {
    const segments = buildHighlightSegments("The accurate report.", [vocab("rate")]);
    expect(highlightedTexts(segments)).toEqual([]);
  });

  it("単語として独立している場合は当てる(rate は a rate に当てる)", () => {
    const segments = buildHighlightSegments("It is a rate.", [vocab("rate")]);
    expect(highlightedTexts(segments)).toEqual(["rate"]);
  });
});
