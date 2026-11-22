import { describe, expect, it } from "vitest";
import { formatJst } from "./buildInfo";

describe("formatJst", () => {
  it("日本時間の日付と時刻にする", () => {
    // 2026-11-22 06:16 UTC は、日本時間では 15:16
    expect(formatJst("2026-11-22T06:16:00+00:00")).toBe("2026/11/22 15:16");
    expect(formatJst("2026-11-21T20:30:00Z")).toBe("2026/11/22 05:30");
  });

  it("空や不正な日時は空文字", () => {
    expect(formatJst("")).toBe("");
    expect(formatJst("not a date")).toBe("");
  });
});
