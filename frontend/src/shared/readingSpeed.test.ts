import { describe, expect, it } from "vitest";
import { countWords, isMeasurableReadingTime, wordsPerMinute } from "./readingSpeed";

describe("countWords", () => {
  it("空白の連続や改行で区切って数える", () => {
    expect(countWords("The sale [1] starts now.\n  Sign up today.")).toBe(8);
  });

  it("空の本文は 0", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("wordsPerMinute", () => {
  it("語数を分で割って四捨五入する(サーバーと同じ式)", () => {
    expect(wordsPerMinute(300, 90)).toBe(200);
    expect(wordsPerMinute(100, 70)).toBe(86);
  });

  it("秒数が 0 以下なら 0", () => {
    expect(wordsPerMinute(100, 0)).toBe(0);
  });
});

describe("isMeasurableReadingTime", () => {
  it("押し忘れ(10秒未満)と放置(30分超)は記録しない", () => {
    expect(isMeasurableReadingTime(9)).toBe(false);
    expect(isMeasurableReadingTime(10)).toBe(true);
    expect(isMeasurableReadingTime(30 * 60)).toBe(true);
    expect(isMeasurableReadingTime(30 * 60 + 1)).toBe(false);
  });
});
