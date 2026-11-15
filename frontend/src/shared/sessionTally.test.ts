import { describe, expect, it } from "vitest";
import { accuracyPercent, addToTally, EMPTY_TALLY, formatStudyTime } from "./sessionTally";

describe("sessionTally", () => {
  it("設問数・正解数・秒数を足していく", () => {
    const t = addToTally(addToTally(EMPTY_TALLY, { total: 1, correct: 1, seconds: 20 }), {
      total: 4,
      correct: 3,
      seconds: 150,
    });
    expect(t).toEqual({ answered: 5, correct: 4, seconds: 170 });
  });

  it("負の秒数は足さない", () => {
    expect(addToTally(EMPTY_TALLY, { total: 1, correct: 0, seconds: -5 }).seconds).toBe(0);
  });

  it("正答率は四捨五入し、未解答なら null", () => {
    expect(accuracyPercent(EMPTY_TALLY)).toBeNull();
    expect(accuracyPercent({ answered: 3, correct: 2, seconds: 0 })).toBe(67);
    expect(accuracyPercent({ answered: 4, correct: 4, seconds: 0 })).toBe(100);
  });

  it("時間を「分秒」で読みやすくする", () => {
    expect(formatStudyTime(45)).toBe("45秒");
    expect(formatStudyTime(120)).toBe("2分");
    expect(formatStudyTime(185)).toBe("3分5秒");
  });
});
