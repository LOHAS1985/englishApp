import { describe, expect, it } from "vitest";
import type { ReviewSummary, Skill, StatsSummary, StudyTotals } from "../api/client";
import { MENU_MINUTES, buildTodayMenu, markDone, refreshDone, todaySeed, type MenuTask } from "./todayMenu";

const SKILLS: Skill[] = ["listening", "reading", "writing", "speaking", "vocab"];
const LISTENING_TYPES = ["toeic-part2", "toeic-part3", "toeic-part4", "eiken-part1", "eiken-part2", "eiken-part3"];

const totals = (seconds = 0, correct = 0, total = 0, sessions = 0): StudyTotals => ({ sessions, seconds, correct, total });

interface Options {
  /** 今週の技能別の学習秒数 */
  week?: Partial<Record<Skill, number>>;
  /** 今日の技能別の学習秒数 */
  today?: Partial<Record<Skill, number>>;
  /** 形式別の1か月の成績 */
  types?: { type: string; sessions: number; correct: number; total: number }[];
  review?: Record<string, ReviewSummary>;
}

function makeSummary(o: Options = {}): StatsSummary {
  const secondsOf = (m?: Partial<Record<Skill, number>>) =>
    Object.fromEntries(SKILLS.map((s) => [s, m?.[s] ?? 0])) as Record<Skill, number>;
  return {
    today: totals(Object.values(o.today ?? {}).reduce((a, b) => a + b, 0)),
    skills: SKILLS.map((skill) => ({ skill, week: totals(o.week?.[skill] ?? 0), month: totals() })),
    types: (o.types ?? []).map((t) => ({ type: t.type, month: totals(0, t.correct, t.total, t.sessions) })),
    daily: [
      { date: "2026-11-13", seconds: secondsOf() },
      { date: "2026-11-14", seconds: secondsOf(o.today) },
    ],
    review: o.review ?? {},
  };
}

/** 全技能が目安どおり学習されている週(順位に差がつかない) */
const FULL_WEEK = Object.fromEntries(SKILLS.map((s) => [s, 2520])) as Record<Skill, number>;

/** 通常のメニュー */
const normalMenu = (o: Options = {}, seed = 0) => buildTodayMenu(makeSummary(o), seed).normal;
/** スピーキングなしのメニュー */
const quietMenu = (o: Options = {}, seed = 0) => buildTodayMenu(makeSummary(o), seed).quiet;

describe("buildTodayMenu(通常)", () => {
  it("記録が空でも、約30分のメニューができる", () => {
    const menu = normalMenu();
    expect(menu.tasks.length).toBeGreaterThanOrEqual(3);
    // 単語帳(4〜5分)を毎日入れるので、残りの課題が収まらず30分に少し届かない日がある
    expect(menu.totalMinutes).toBeGreaterThanOrEqual(MENU_MINUTES - 3);
    expect(menu.totalMinutes).toBeLessThanOrEqual(35);
    expect(menu.totalMinutes).toBe(menu.tasks.reduce((a, t) => a + t.minutes, 0));
  });

  it("同じ技能の課題は1日1つまで(復習を除く)", () => {
    const skills = normalMenu().tasks.filter((t) => !t.review).map((t) => t.skill);
    expect(new Set(skills).size).toBe(skills.length);
  });

  it("復習日になった問題があると、復習が最初に並ぶ", () => {
    const menu = normalMenu({ review: { vocab: { feature: "vocab", due: 10, pending: 0 } } });
    expect(menu.tasks[0]?.id).toBe("review:vocab");
    expect(menu.tasks[0]?.review).toBe(true);
    expect(menu.tasks[0]?.path).toBe("/vocab?review=1");
  });

  it("復習が0問なら、復習の課題は入らない", () => {
    const menu = normalMenu({ review: { vocab: { feature: "vocab", due: 0, pending: 3 } } });
    expect(menu.tasks.some((t) => t.review)).toBe(false);
  });

  it("今週の学習が少ない技能を優先する", () => {
    // スピーキングとライティングだけ今週まったく学習していない
    const menu = normalMenu({ week: { ...FULL_WEEK, speaking: 0, writing: 0 } });
    // 毎日入る単語帳(語彙)を除いて、技能の順位で並ぶ
    const ranked = menu.tasks.filter((t) => t.skill !== "vocab");
    const first = ranked.slice(0, 2).map((t) => t.skill);
    expect(first).toContain("speaking");
    expect(first).toContain("writing");
    expect(ranked[0]?.reason).toContain("今週");
  });

  it("正答率が低い形式を選ぶ", () => {
    const types = LISTENING_TYPES.map((type) =>
      type === "toeic-part3"
        ? { type, sessions: 5, correct: 3, total: 15 }
        : { type, sessions: 5, correct: 14, total: 15 },
    );
    // リスニングだけ今週の学習が少ない(技能として最優先になる)
    const menu = normalMenu({ week: { ...FULL_WEEK, listening: 0 }, types });
    expect(menu.tasks.find((t) => t.skill === "listening")?.id).toBe("listening:toeic-part3");
  });

  it("この1か月まだ解いていない形式を優先する", () => {
    // 5つの形式は十分に解いていて、toeic-part4 だけ解いたことがない
    const types = LISTENING_TYPES.filter((t) => t !== "toeic-part4").map((type) => ({
      type,
      sessions: 5,
      correct: 14,
      total: 15,
    }));
    const menu = normalMenu({ week: { ...FULL_WEEK, listening: 0 }, types });
    expect(menu.tasks.find((t) => t.skill === "listening")?.id).toBe("listening:toeic-part4");
  });

  it("同じ順位の形式は、日替わりで回る", () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < LISTENING_TYPES.length; seed++) {
      const id = normalMenu({}, seed).tasks.find((t) => t.skill === "listening")?.id;
      if (id) ids.add(id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it("今日すでに十分学習した技能は、順位が下がる", () => {
    // 全技能が目安どおりの週。リスニングだけ、今日すでに10分学習している
    const menu = normalMenu({ week: FULL_WEEK, today: { listening: 600 } });
    const index = menu.tasks.findIndex((t) => t.skill === "listening");
    // 入らないか、最後に並ぶ
    expect(index === -1 || index === menu.tasks.length - 1).toBe(true);
  });

  it("メニューを作った日(seed)を覚えている", () => {
    expect(buildTodayMenu(makeSummary(), 123).seed).toBe(123);
  });
});

describe("単語帳", () => {
  const wordbookOf = (menu: { tasks: MenuTask[] }) => menu.tasks.filter((t) => t.id.startsWith("vocab:wordbook"));

  it("記録が空でも、毎日1つ入る(復習の次)", () => {
    for (let seed = 0; seed < 6; seed++) {
      expect(wordbookOf(normalMenu({}, seed))).toHaveLength(1);
    }
    const menu = normalMenu({ review: { vocab: { feature: "vocab", due: 10, pending: 0 } } });
    expect(menu.tasks.map((t) => t.id).slice(0, 2)).toEqual(["review:vocab", expect.stringMatching(/^vocab:wordbook-/)]);
  });

  it("語彙が十分に学習された週や、今日学習した日でも入る", () => {
    const menu = normalMenu({ week: FULL_WEEK, today: { vocab: 1800 } });
    expect(wordbookOf(menu)).toHaveLength(1);
  });

  it("スピーキングなしのメニューにも入る(声を出さない課題)", () => {
    expect(wordbookOf(quietMenu())).toHaveLength(1);
  });

  it("4択と穴埋めは、日替わりで回る", () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 4; seed++) ids.add(wordbookOf(normalMenu({}, seed))[0]?.id ?? "");
    expect(ids).toEqual(new Set(["vocab:wordbook-choice", "vocab:wordbook-fill"]));
  });

  it("正答率が低い方・この1か月解いていない方を選ぶ", () => {
    const lowFill = [
      { type: "wordbook-choice", sessions: 5, correct: 14, total: 15 },
      { type: "wordbook-fill", sessions: 5, correct: 6, total: 15 },
    ];
    expect(wordbookOf(normalMenu({ types: lowFill }))[0]?.id).toBe("vocab:wordbook-fill");
    const neverChoice = [{ type: "wordbook-fill", sessions: 5, correct: 14, total: 15 }];
    expect(wordbookOf(normalMenu({ types: neverChoice }))[0]?.id).toBe("vocab:wordbook-choice");
  });

  it("単語帳の画面に飛ぶ(形式を指定する)", () => {
    const task = wordbookOf(normalMenu({}, 0))[0]!;
    expect(task.path).toBe(`/wordbook/quiz?type=${task.id.endsWith("choice") ? "choice" : "fill"}`);
  });

  it("入れても合計は35分以内で、約30分になる", () => {
    for (let seed = 0; seed < 6; seed++) {
      const menu = normalMenu({}, seed);
      expect(menu.totalMinutes).toBeGreaterThanOrEqual(MENU_MINUTES - 3);
      expect(menu.totalMinutes).toBeLessThanOrEqual(35);
    }
  });

  it("今日の語彙の学習時間が課題の7割以上なら、済みにする", () => {
    const task = wordbookOf(normalMenu({}, 0))[0]!;
    const menu = normalMenu({}, 0);
    const seconds = Math.ceil(task.minutes * 60 * 0.7);
    const done = markDone(menu.tasks, makeSummary({ today: { vocab: seconds } }));
    expect(done.find((t) => t.id.startsWith("vocab:wordbook"))?.done).toBe(true);
  });
});

describe("buildTodayMenu(スピーキングなし)", () => {
  it("スピーキングの課題が入らない", () => {
    // スピーキングが今週まったく学習されていなくても入れない
    const menu = quietMenu({ week: { ...FULL_WEEK, speaking: 0 } });
    expect(menu.tasks.some((t) => t.skill === "speaking")).toBe(false);
    // 通常のメニューには入る(スピーキングが最優先の週)
    expect(normalMenu({ week: { ...FULL_WEEK, speaking: 0 } }).tasks.some((t) => t.skill === "speaking")).toBe(true);
  });

  it("スピーキングを除いても、約30分のメニューになる", () => {
    const menu = quietMenu();
    expect(menu.totalMinutes).toBeGreaterThanOrEqual(MENU_MINUTES - 2);
    expect(menu.totalMinutes).toBeLessThanOrEqual(35);
    expect(menu.totalMinutes).toBe(menu.tasks.reduce((a, t) => a + t.minutes, 0));
  });

  it("通常のメニューにもある技能は、同じ形式を選ぶ", () => {
    const normal = normalMenu({}, 3).tasks;
    const quiet = quietMenu({}, 3).tasks;
    const shared = quiet.filter((q) => normal.some((n) => n.skill === q.skill));
    expect(shared.length).toBeGreaterThan(0);
    for (const q of shared) {
      expect(normal.find((n) => n.skill === q.skill)?.id).toBe(q.id);
    }
  });

  it("復習は、スピーキングなしのメニューにも最初に入る", () => {
    const menu = quietMenu({ review: { grammar: { feature: "grammar", due: 6, pending: 0 } } });
    expect(menu.tasks[0]?.id).toBe("review:grammar");
  });
});

describe("markDone", () => {
  it("今日その技能を課題の時間の7割以上学習していれば、済みにする", () => {
    const menu = normalMenu();
    const listening = menu.tasks.find((t) => t.skill === "listening");
    expect(listening).toBeDefined();
    const seconds = Math.ceil((listening?.minutes ?? 0) * 60 * 0.7);
    const done = markDone(menu.tasks, makeSummary({ today: { listening: seconds } }));
    expect(done.find((t) => t.skill === "listening")?.done).toBe(true);
    expect(done.filter((t) => t.skill !== "listening").every((t) => !t.done)).toBe(true);
  });

  it("学習が足りなければ、済みにならない", () => {
    const done = markDone(normalMenu().tasks, makeSummary({ today: { listening: 60 } }));
    expect(done.every((t) => !t.done)).toBe(true);
  });

  it("復習は、復習日になっている問題がなくなったら済み", () => {
    const menu = normalMenu({ review: { vocab: { feature: "vocab", due: 5, pending: 0 } } });
    expect(menu.tasks[0]?.done).toBe(false);
    const done = markDone(menu.tasks, makeSummary({ review: { vocab: { feature: "vocab", due: 0, pending: 0 } } }));
    expect(done[0]?.done).toBe(true);
  });
});

describe("refreshDone", () => {
  it("通常とスピーキングなしの両方に、済みの印を付け直す", () => {
    const menu = buildTodayMenu(makeSummary(), 0);
    const refreshed = refreshDone(menu, makeSummary({ today: { listening: 3600 } }));
    expect(refreshed.normal.tasks.find((t) => t.skill === "listening")?.done).toBe(true);
    expect(refreshed.quiet.tasks.find((t) => t.skill === "listening")?.done).toBe(true);
    // 課題の並びは変えない
    expect(refreshed.normal.tasks.map((t) => t.id)).toEqual(menu.normal.tasks.map((t) => t.id));
    expect(refreshed.quiet.tasks.map((t) => t.id)).toEqual(menu.quiet.tasks.map((t) => t.id));
  });
});

describe("todaySeed", () => {
  it("日本時間の0時に切り替わる", () => {
    const beforeMidnight = Date.UTC(2026, 10, 14, 14, 59, 59); // 日本時間 23:59:59
    const afterMidnight = Date.UTC(2026, 10, 14, 15, 0, 0); // 日本時間 翌日 0:00:00
    expect(todaySeed(afterMidnight)).toBe(todaySeed(beforeMidnight) + 1);
  });

  it("同じ日のうちは同じ値", () => {
    const morning = Date.UTC(2026, 10, 14, 0, 0, 0);
    const evening = Date.UTC(2026, 10, 14, 14, 0, 0);
    expect(todaySeed(evening)).toBe(todaySeed(morning));
  });
});
