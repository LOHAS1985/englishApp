import { describe, expect, it } from "vitest";
import type { MockItem } from "../../api/client";
import { formatClock, itemKey, numberOffsets } from "./mockFormat";

const item = (questionCount: number): MockItem => ({
  feature: "reading",
  id: `r${questionCount}`,
  type: "toeic-part7",
  title: null,
  passage: null,
  situation: null,
  graphic: null,
  questions: Array.from({ length: questionCount }, () => ({ question: "", choices: [] })),
});

describe("numberOffsets", () => {
  it("各問題の前にある設問数を返す(設問番号を通し番号にするため)", () => {
    expect(numberOffsets([item(4), item(2), item(3)])).toEqual([0, 4, 6]);
  });

  it("問題が無ければ空", () => {
    expect(numberOffsets([])).toEqual([]);
  });
});

describe("itemKey", () => {
  it("リスニングと読解で同じ ID があっても区別する", () => {
    expect(itemKey({ feature: "listening", id: "x" })).not.toBe(itemKey({ feature: "reading", id: "x" }));
  });
});

describe("formatClock", () => {
  it("残り秒数を m:ss で表す", () => {
    expect(formatClock(75 * 60)).toBe("75:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(0)).toBe("0:00");
  });
});
