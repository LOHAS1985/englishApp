import { describe, expect, it } from "vitest";
import type { LevelSummary } from "../../api/client";
import { levelProgress } from "./levelProgress";

/** 進み具合の計算に使うのは累計経験値の3項目だけなので、それ以外は固定の値で埋める */
function summary(over: Pick<LevelSummary, "totalXp" | "levelStartXp" | "nextLevelXp">): LevelSummary {
  return {
    level: 5,
    maxLevel: 100,
    today: { total: 0, answers: 0, time: 0, bonus: 0, multiplier: 1, minutes: 0, skills: 0 },
    streakDays: 0,
    dailyTargetXp: 600,
    expectedXp: 0,
    expectedLevel: 5,
    pace: "onTrack",
    xpPerDayToGoal: 0,
    daysLeft: 0,
    goalDate: "2027-03-31",
    recentDays: [],
    ...over,
  };
}

describe("levelProgress", () => {
  it("次のレベルまでの途中は、経験値の割合を返す", () => {
    expect(levelProgress(summary({ totalXp: 150, levelStartXp: 100, nextLevelXp: 200 }))).toBeCloseTo(0.5);
  });

  it("レベルに上がったばかりなら 0", () => {
    expect(levelProgress(summary({ totalXp: 100, levelStartXp: 100, nextLevelXp: 200 }))).toBe(0);
  });

  it("次のレベルの経験値に達していたら 1(それ以上は 1 のまま)", () => {
    expect(levelProgress(summary({ totalXp: 200, levelStartXp: 100, nextLevelXp: 200 }))).toBe(1);
    expect(levelProgress(summary({ totalXp: 260, levelStartXp: 100, nextLevelXp: 200 }))).toBe(1);
  });

  it("Lv.100 (次のレベルが無い)なら 1", () => {
    expect(levelProgress(summary({ totalXp: 99999, levelStartXp: 90000, nextLevelXp: null }))).toBe(1);
  });

  it("次のレベルとの差が 0 以下でも割り算せず 1 を返す", () => {
    expect(levelProgress(summary({ totalXp: 100, levelStartXp: 100, nextLevelXp: 100 }))).toBe(1);
  });
});
