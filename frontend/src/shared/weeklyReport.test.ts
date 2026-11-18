// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { Skill, StatsSummary, StudyTotals } from "../api/client";
import {
  buildWeeklyReport,
  formatDuration,
  jstDate,
  loadSavedWeeklyReport,
  saveWeeklyReport,
} from "./weeklyReport";

const SKILLS: Skill[] = ["listening", "reading", "writing", "speaking", "vocab"];
const totals = (sessions = 0, seconds = 0, correct = 0, total = 0): StudyTotals => ({ sessions, seconds, correct, total });

function summary(): StatsSummary {
  const day = (date: string, seconds: Partial<Record<Skill, number>>) => ({
    date,
    seconds: Object.fromEntries(SKILLS.map((s) => [s, seconds[s] ?? 0])) as Record<Skill, number>,
  });
  return {
    today: totals(),
    skills: [
      { skill: "listening", week: totals(3, 1500, 20, 30), month: totals() },
      { skill: "reading", week: totals(2, 900, 6, 10), month: totals() },
      { skill: "writing", week: totals(2, 1800, 24, 32), month: totals() },
      { skill: "speaking", week: totals(), month: totals() },
      { skill: "vocab", week: totals(4, 600, 30, 40), month: totals() },
    ],
    types: [
      { type: "eiken-opinion", skill: "writing", week: totals(2, 1800, 24, 32), month: totals() },
      { type: "toeic-part3", skill: "listening", week: totals(1, 400, 2, 3), month: totals() },
      { type: "toeic-part2", skill: "listening", week: totals(2, 1100, 18, 27), month: totals() },
      { type: "wordbook-choice", skill: "vocab", week: totals(4, 600, 30, 40), month: totals() },
      // 今週は学習していない形式(直近30日にだけある)
      { type: "toeic-part4", skill: "listening", week: totals(), month: totals(1, 300, 2, 3) },
    ],
    daily: [
      day("2026-11-10", { listening: 999 }), // 7日より前(表示しない)
      day("2026-11-11", {}),
      day("2026-11-12", { listening: 600 }),
      day("2026-11-13", {}),
      day("2026-11-14", { reading: 900, vocab: 300 }),
      day("2026-11-15", {}),
      day("2026-11-16", { writing: 1800 }),
      day("2026-11-17", { listening: 900, vocab: 300 }),
    ],
    review: {},
  };
}

describe("buildWeeklyReport", () => {
  it("技能ごとに時間・問題数・正答率を出す(技能の並びは決まっている)", () => {
    const report = buildWeeklyReport(summary());
    expect(report.skills.map((s) => s.skill)).toEqual(["listening", "reading", "speaking", "writing", "vocab"]);
    const listening = report.skills.find((s) => s.skill === "listening")!;
    expect(listening).toMatchObject({ seconds: 1500, count: 30, unit: "問" });
    expect(listening.accuracy).toBeCloseTo(20 / 30);
  });

  it("ライティング・スピーキングは、問題数ではなく題数(回数)で数え、正答率は出さない", () => {
    const report = buildWeeklyReport(summary());
    const writing = report.skills.find((s) => s.skill === "writing")!;
    expect(writing).toMatchObject({ count: 2, unit: "題", accuracy: null });
    // 学習していない技能は 0
    expect(report.skills.find((s) => s.skill === "speaking")).toMatchObject({ seconds: 0, count: 0 });
  });

  it("日別は直近7日で、最後の日が今日。技能ごとの秒数と合計を持つ", () => {
    const report = buildWeeklyReport(summary());
    expect(report.days).toHaveLength(7);
    expect(report.days[0]?.date).toBe("2026-11-11");
    expect(report.days.at(-1)).toMatchObject({ date: "2026-11-17", isToday: true, totalSeconds: 1200 });
    expect(report.days.filter((d) => d.isToday)).toHaveLength(1);
    expect(report.days[3]?.totalSeconds).toBe(1200);
    expect(report.days.at(-1)).toMatchObject({ label: "11/17", weekday: "火" });
  });

  it("形式別は、今週学習した形式だけを、技能の順・時間の長い順に並べる", () => {
    const report = buildWeeklyReport(summary());
    expect(report.types.map((t) => t.type)).toEqual([
      "toeic-part2",
      "toeic-part3",
      "eiken-opinion",
      "wordbook-choice",
    ]);
    expect(report.types[0]).toMatchObject({ label: "TOEIC Part 2", count: 27, unit: "問" });
  });

  it("知らない形式は、形式名のまま出す", () => {
    const s = summary();
    s.types.push({ type: "new-type", skill: "reading", week: totals(1, 60, 1, 1), month: totals() });
    expect(buildWeeklyReport(s).types.find((t) => t.type === "new-type")?.label).toBe("new-type");
  });

  it("古いバックエンドの応答(形式別に今週の値が無い)でも、技能別と日別は出せる", () => {
    const s = summary();
    s.types = [{ type: "toeic-part2", month: totals(2, 100, 1, 2) }];
    const report = buildWeeklyReport(s);
    expect(report.types).toEqual([]);
    expect(report.totalSeconds).toBe(1500 + 900 + 1800 + 600);
  });

  it("合計は、技能別の時間の合計", () => {
    expect(buildWeeklyReport(summary()).totalSeconds).toBe(4800);
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0分"],
    [20, "1分未満"],
    [60, "1分"],
    [2700, "45分"],
    [3600, "1時間"],
    [3900, "1時間5分"],
  ])("%i秒は「%s」", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe("jstDate", () => {
  it("日本時間の0時に切り替わる", () => {
    expect(jstDate(Date.UTC(2026, 10, 17, 14, 59, 59))).toBe("2026-11-17");
    expect(jstDate(Date.UTC(2026, 10, 17, 15, 0, 0))).toBe("2026-11-18");
  });
});

describe("保存した今週の学習", () => {
  beforeEach(() => localStorage.clear());

  it("同じ日のうちは読み出せ、日付が変わったら使わない", () => {
    const report = buildWeeklyReport(summary());
    saveWeeklyReport(report);
    expect(loadSavedWeeklyReport("2026-11-17")?.totalSeconds).toBe(report.totalSeconds);
    expect(loadSavedWeeklyReport("2026-11-18")).toBeNull();
  });

  it("壊れた内容は無視する", () => {
    localStorage.setItem("englishApp.weeklyReport", "{broken");
    expect(loadSavedWeeklyReport("2026-11-17")).toBeNull();
    localStorage.setItem("englishApp.weeklyReport", JSON.stringify({ date: "2026-11-17" }));
    expect(loadSavedWeeklyReport("2026-11-17")).toBeNull();
  });
});
