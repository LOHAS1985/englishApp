// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchStatsSummary, type Skill, type StatsSummary, type StudyTotals } from "../api/client";
import { buildTodayMenu, saveLastSummary, saveMenu, todaySeed } from "../shared/todayMenu";
import TodayMenuSection from "./TodayMenuSection";

vi.mock("../api/client", () => ({ fetchStatsSummary: vi.fn() }));

const SKILLS: Skill[] = ["listening", "reading", "writing", "speaking", "vocab"];
const totals = (seconds = 0): StudyTotals => ({ sessions: 0, seconds, correct: 0, total: 0 });

/** 今日の学習時間(秒)を技能ごとに指定できる学習記録の集計 */
function summary(today: Partial<Record<Skill, number>> = {}): StatsSummary {
  const seconds = Object.fromEntries(SKILLS.map((s) => [s, today[s] ?? 0])) as Record<Skill, number>;
  return {
    today: totals(Object.values(seconds).reduce((a, b) => a + b, 0)),
    skills: SKILLS.map((skill) => ({ skill, week: totals(), month: totals() })),
    types: [],
    daily: [{ date: "2026-11-18", seconds }],
    review: {},
  };
}

/** 後から結果を決められる、取得の待ち */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderSection() {
  return render(
    <MemoryRouter>
      <TodayMenuSection />
    </MemoryRouter>,
  );
}

/** 保存済みのメニューを作っておく(今日の分) */
function saveTodaysMenu(seed = todaySeed(), todayMinutes = 7) {
  const menu = buildTodayMenu(summary(), seed);
  saveMenu({ ...menu, seed, todayMinutes });
  return menu;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchStatsSummary).mockReset();
});
afterEach(cleanup);

describe("今日のメニュー: 表示するメニューの種類", () => {
  it("既定はスピーキングなしのメニューで、タブも先頭に並ぶ", () => {
    saveTodaysMenu();
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {}));

    renderSection();

    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]?.textContent).toContain("スピーキングなし");
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
    // 表示中の課題にスピーキングは無い
    expect(screen.queryByText(/面接練習/)).toBeNull();
  });

  it("「通常」に切り替えると、スピーキングを含むメニューが出る", async () => {
    // スピーキングが最優先になる(他の技能は今週十分に学習している)記録から作る
    const base = summary();
    const full = { ...base, skills: base.skills.map((k) => ({ ...k, week: totals(2520) })) };
    full.skills = full.skills.map((k) => (k.skill === "speaking" ? { ...k, week: totals(0) } : k));
    const menu = buildTodayMenu(full, todaySeed());
    saveMenu({ ...menu, seed: todaySeed(), todayMinutes: 0 });
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {}));

    renderSection();
    expect(screen.queryByText(/面接練習/)).toBeNull();

    await userEvent.click(screen.getByRole("tab", { name: /通常/ }));

    expect(screen.getByText(/面接練習/)).toBeTruthy();
  });
});

describe("今日のメニュー: 保存済みがある日", () => {
  it("サーバーの応答を待たずに、保存済みのメニューをすぐ出す", () => {
    const menu = saveTodaysMenu();
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {})); // 応答は返らない

    renderSection();

    // 描画した直後(応答を待たずに)から、メニューと前回の学習時間が見える
    expect(screen.getByText(menu.quiet.tasks[0]!.label)).toBeTruthy();
    expect(screen.getByText("7", { selector: "span.font-mono" })).toBeTruthy();
    expect(screen.queryByText("今日のメニューを作っています…")).toBeNull();
    expect(screen.getByText("更新中…")).toBeTruthy();
  });

  it("各課題には、形式と問題数・時間だけを出す(選んだ理由や色の印は出さない)", () => {
    const menu = saveTodaysMenu();
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {}));

    const { container } = renderSection();

    for (const task of menu.quiet.tasks) {
      expect(screen.getByText(task.label)).toBeTruthy();
      expect(screen.getAllByText(task.note).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText(/ため$|形式$|復習する日/)).toBeNull();
    expect(container.querySelector("li .rounded-full")).toBeNull();
  });

  it("応答が返ったら、済みの印と今日の学習時間を最新にする", async () => {
    saveTodaysMenu();
    // 全部の技能を1時間学習した今日の記録
    const done = deferred<StatsSummary>();
    vi.mocked(fetchStatsSummary).mockReturnValue(done.promise);

    renderSection();
    expect(screen.queryByText("済 ✓")).toBeNull();

    done.resolve(summary({ listening: 3600, reading: 3600, writing: 3600, speaking: 3600, vocab: 3600 }));

    await waitFor(() => expect(screen.getAllByText("済 ✓").length).toBeGreaterThan(0));
    expect(screen.getByText("300", { selector: "span.font-mono" })).toBeTruthy();
    expect(screen.queryByText("更新中…")).toBeNull();
  });

  it("通信に失敗しても、保存済みのメニューは消さず、取得できなかったことを知らせる", async () => {
    const menu = saveTodaysMenu();
    vi.mocked(fetchStatsSummary).mockRejectedValue(new Error("サーバーに接続できません"));

    renderSection();

    await waitFor(() => expect(screen.getByText(/最新の状況を取得できませんでした/)).toBeTruthy());
    expect(screen.getByText(menu.quiet.tasks[0]!.label)).toBeTruthy();
    // 「作れませんでした」のエラー表示には切り替えない
    expect(screen.queryByText(/今日のメニューを作れませんでした/)).toBeNull();
  });

  it("昨日のメニューは使わない(日付が変わったら、取得してから作る)", () => {
    saveTodaysMenu(todaySeed() - 1);
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {}));

    renderSection();

    expect(screen.getByText("今日のメニューを作っています…")).toBeTruthy();
  });
});

describe("今日のメニュー: 日付が変わって最初に開いたとき(前回の記録がある)", () => {
  it("応答を待たずに、前回の記録から仮のメニューを出す。前回の日の学習で「済」にはしない", () => {
    saveTodaysMenu(todaySeed() - 1);
    // 前の日に全技能を1時間学習した記録
    saveLastSummary(summary({ listening: 3600, reading: 3600, writing: 3600, speaking: 3600, vocab: 3600 }));
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {}));

    renderSection();

    expect(screen.queryByText("今日のメニューを作っています…")).toBeNull();
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.queryByText("済 ✓")).toBeNull();
    expect(screen.getByText(/前回の記録から仮に作成/)).toBeTruthy();
    // 仮のメニューは保存しない(最新の記録で作り直すため)
    expect(JSON.parse(localStorage.getItem("englishApp.todayMenu") ?? "null").seed).toBe(todaySeed() - 1);
  });

  it("応答が返ったら、最新の記録でメニューを作り直して保存する", async () => {
    saveLastSummary(summary());
    const pending = deferred<StatsSummary>();
    vi.mocked(fetchStatsSummary).mockReturnValue(pending.promise);

    renderSection();
    expect(screen.queryByText(/文法の復習/)).toBeNull();

    // 今日が復習日の問題がある(前回の記録には無かった)
    pending.resolve({ ...summary(), review: { grammar: { feature: "grammar", due: 5, pending: 5 } } });

    await waitFor(() => expect(screen.getByText(/文法の復習/)).toBeTruthy());
    expect(screen.queryByText(/前回の記録から仮に作成/)).toBeNull();
    const saved = JSON.parse(localStorage.getItem("englishApp.todayMenu") ?? "null");
    expect(saved.seed).toBe(todaySeed());
    expect(saved.provisional).toBeUndefined();
  });
});

describe("今日のメニュー: 保存済みが無い日の最初の1回", () => {
  it("記録を取得する間は「作っています…」を出し、返ったらメニューを作って保存する", async () => {
    const pending = deferred<StatsSummary>();
    vi.mocked(fetchStatsSummary).mockReturnValue(pending.promise);

    renderSection();
    expect(screen.getByText("今日のメニューを作っています…")).toBeTruthy();

    pending.resolve(summary({ vocab: 600 }));

    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    expect(screen.queryByText("今日のメニューを作っています…")).toBeNull();
    // 保存した(次に開いたときに、待たずに出せる)。学習時間も一緒に保存している
    const saved = JSON.parse(localStorage.getItem("englishApp.todayMenu") ?? "null");
    expect(saved.seed).toBe(todaySeed());
    expect(saved.todayMinutes).toBe(10);
  });

  it("次に開いたときは、保存したメニューと学習時間を、応答を待たずに出す", async () => {
    const first = deferred<StatsSummary>();
    vi.mocked(fetchStatsSummary).mockReturnValueOnce(first.promise);
    const { unmount } = renderSection();
    first.resolve(summary({ vocab: 600 }));
    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    unmount();

    // 2回目: 応答は返らないが、メニューは見える
    vi.mocked(fetchStatsSummary).mockReturnValue(new Promise(() => {}));
    renderSection();
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(screen.getByText("10", { selector: "span.font-mono" })).toBeTruthy();
  });

  it("取得に失敗したら、エラーと「もう一度試す」を出し、押すとやり直す", async () => {
    vi.mocked(fetchStatsSummary)
      .mockRejectedValueOnce(new Error("サーバーに接続できません"))
      .mockResolvedValueOnce(summary());

    renderSection();

    await waitFor(() => expect(screen.getByText(/今日のメニューを作れませんでした/)).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

    await waitFor(() => expect(screen.getByRole("tablist")).toBeTruthy());
    expect(fetchStatsSummary).toHaveBeenCalledTimes(2);
  });
});
