// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchStatsSummary, type Skill, type StatsSummary, type StudyTotals } from "../api/client";
import { buildWeeklyReport, jstDate, saveWeeklyReport } from "../shared/weeklyReport";
import WeeklyStatsSection from "./WeeklyStatsSection";

vi.mock("../api/client", () => ({ fetchStatsSummary: vi.fn() }));

const SKILLS: Skill[] = ["listening", "reading", "writing", "speaking", "vocab"];
const totals = (sessions = 0, seconds = 0, correct = 0, total = 0): StudyTotals => ({ sessions, seconds, correct, total });

/** 今日(日本時間)を最後にした7日分の集計。listening は1500秒・30問、writing は2題 */
function summary(active = true): StatsSummary {
  const today = jstDate();
  const seconds = (s: Partial<Record<Skill, number>>) =>
    Object.fromEntries(SKILLS.map((k) => [k, s[k] ?? 0])) as Record<Skill, number>;
  return {
    today: totals(),
    skills: SKILLS.map((skill) => ({
      skill,
      week: !active
        ? totals()
        : skill === "listening"
          ? totals(3, 1500, 20, 30)
          : skill === "writing"
            ? totals(2, 1800, 24, 32)
            : totals(),
      month: totals(),
    })),
    types: active
      ? [
          { type: "toeic-part2", skill: "listening", week: totals(3, 1500, 20, 30), month: totals() },
          { type: "eiken-opinion", skill: "writing", week: totals(2, 1800, 24, 32), month: totals() },
        ]
      : [],
    daily: [{ date: today, seconds: seconds(active ? { listening: 1500, writing: 1800 } : {}) }],
    review: {},
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchStatsSummary).mockReset();
});
afterEach(cleanup);

describe("今週の学習", () => {
  it("技能別の時間・問題数と、形式別の表を出す", async () => {
    vi.mocked(fetchStatsSummary).mockResolvedValue(summary());

    render(<WeeklyStatsSection />);

    await waitFor(() => expect(screen.getByText("今週の学習")).toBeTruthy());
    // 技能別の表: リスニングは 25分・30問・正答率 67%、ライティングは 30分・2題(正答率は出さない)
    const skills = screen.getByRole("table", { name: "技能別" });
    const listening = within(skills).getByText("リスニング").closest("tr")!;
    expect(within(listening).getByText("25分")).toBeTruthy();
    expect(within(listening).getByText("30問")).toBeTruthy();
    expect(within(listening).getByText("67%")).toBeTruthy();
    const writing = within(skills).getByText("ライティング").closest("tr")!;
    expect(within(writing).getByText("30分")).toBeTruthy();
    expect(within(writing).getByText("2題")).toBeTruthy();
    expect(within(writing).getAllByText("-")).toHaveLength(1);
    // 学習していない技能(リーディング)は、時間・問題数・正答率がすべて「-」
    const reading = within(skills).getByText("リーディング").closest("tr")!;
    expect(within(reading).getAllByText("-")).toHaveLength(3);
    // 合計
    expect(screen.getByText("55分")).toBeTruthy();
    // 形式別の表
    const table = screen.getByRole("table", { name: "形式別" });
    const part2 = within(table).getByText("TOEIC Part 2").closest("tr")!;
    expect(within(part2).getByText("25分")).toBeTruthy();
    expect(within(part2).getByText("30問")).toBeTruthy();
    expect(within(part2).getByText("67%")).toBeTruthy();
    const opinion = within(table).getByText("英検 意見論述").closest("tr")!;
    expect(within(opinion).getByText("2題")).toBeTruthy();
    expect(within(opinion).getByText("-")).toBeTruthy();
  });

  it("学習の記録が無い週は、そのことを伝える", async () => {
    vi.mocked(fetchStatsSummary).mockResolvedValue(summary(false));

    render(<WeeklyStatsSection />);

    await waitFor(() => expect(screen.getByText(/まだ学習の記録がありません/)).toBeTruthy());
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("保存した内容は、応答を待たずにすぐ出し、取得に失敗しても残して知らせる", async () => {
    saveWeeklyReport(buildWeeklyReport(summary()));
    vi.mocked(fetchStatsSummary).mockRejectedValue(new Error("サーバーに接続できません"));

    render(<WeeklyStatsSection />);

    // 描画の直後から見える(リスニングの正答率 67%)
    const skillRow = () => within(screen.getByRole("table", { name: "技能別" })).getByText("リスニング").closest("tr")!;
    expect(within(skillRow()).getByText("67%")).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/最新の状況を取得できませんでした/)).toBeTruthy());
    expect(within(skillRow()).getByText("67%")).toBeTruthy();
  });

  it("保存が無いまま取得に失敗したら、短く知らせる", async () => {
    vi.mocked(fetchStatsSummary).mockRejectedValue(new Error("サーバーに接続できません"));

    render(<WeeklyStatsSection />);

    expect(screen.getByText("今週の学習を読み込んでいます…")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("今週の学習を取得できませんでした。")).toBeTruthy());
  });
});
