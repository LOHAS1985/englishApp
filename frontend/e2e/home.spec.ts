import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi.ts";

const BASE = "/englishApp";
const SKILLS = ["listening", "reading", "writing", "speaking", "vocab"] as const;

const totals = (sessions = 0, seconds = 0, correct = 0, total = 0) => ({ sessions, seconds, correct, total });

/** 日本時間の今日を最後にした14日分の学習記録(今週は4日学習している) */
function statsSummary() {
  const jstNow = Date.now() + 9 * 60 * 60 * 1000;
  const seconds = (s: Partial<Record<(typeof SKILLS)[number], number>>) =>
    Object.fromEntries(SKILLS.map((k) => [k, s[k] ?? 0]));
  const perDay: Partial<Record<(typeof SKILLS)[number], number>>[] = [];
  for (let i = 0; i < 14; i++) perDay.push({});
  perDay[13] = { listening: 900, vocab: 300, reading: 600 };
  perDay[12] = { writing: 1500 };
  perDay[10] = { listening: 1200, reading: 900 };
  perDay[8] = { vocab: 420, listening: 600 };
  return {
    today: totals(3, 1800, 21, 30),
    skills: [
      { skill: "listening", week: totals(5, 2700, 36, 45), month: totals() },
      { skill: "reading", week: totals(4, 1500, 14, 20), month: totals() },
      { skill: "writing", week: totals(1, 1500, 12, 16), month: totals() },
      { skill: "speaking", week: totals(), month: totals() },
      { skill: "vocab", week: totals(6, 720, 50, 60), month: totals() },
    ],
    types: [
      { type: "toeic-part2", skill: "listening", week: totals(2, 1200, 18, 25), month: totals() },
      { type: "toeic-part3", skill: "listening", week: totals(3, 1500, 18, 20), month: totals() },
      { type: "toeic-part5", skill: "reading", week: totals(2, 700, 7, 10), month: totals() },
      { type: "toeic-part7", skill: "reading", week: totals(2, 800, 7, 10), month: totals() },
      { type: "eiken-opinion", skill: "writing", week: totals(1, 1500, 12, 16), month: totals() },
      { type: "wordbook-choice", skill: "vocab", week: totals(6, 720, 50, 60), month: totals() },
    ],
    daily: perDay.map((s, i) => ({
      date: new Date(jstNow - (13 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      seconds: seconds(s),
    })),
    review: {},
  };
}

test.describe("ホームの今週の学習", () => {
  test("ホームの下に、技能別・日別・形式別の今週の学習が出る", async ({ page }) => {
    await mockApi(page, { "GET /api/stats/summary": statsSummary(), "GET /api/review/summary": {} });
    await page.goto(`${BASE}/`);

    const section = page.getByRole("region", { name: "今週の学習" });
    await expect(section).toBeVisible();
    await expect(section.getByText("45分・45問・正答率 80%")).toBeVisible();
    await expect(section.getByText("まだ学習していません")).toBeVisible(); // スピーキング
    // 形式別の内訳は、既定では閉じている。開いてから表を確かめる
    await section.getByText("形式別の内訳").click();
    await expect(section.getByRole("table").getByText("TOEIC Part 3")).toBeVisible();

    // 「今日のメニュー」より下にある
    const menu = await page.getByRole("heading", { name: /今日の30分メニュー/ }).boundingBox();
    const week = await section.boundingBox();
    expect(week!.y).toBeGreaterThan(menu!.y);

    await section.screenshot({ path: "test-results/weekly-desktop.png" });
  });

  test("スマホの幅でも横にはみ出さず、ダークでも見える", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await mockApi(page, { "GET /api/stats/summary": statsSummary(), "GET /api/review/summary": {} });
    await page.goto(`${BASE}/`);

    const section = page.getByRole("region", { name: "今週の学習" });
    await expect(section).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await section.screenshot({ path: "test-results/weekly-mobile.png" });

    await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("group", { name: "配色" }).getByRole("button", { name: "ダーク" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await section.screenshot({ path: "test-results/weekly-mobile-dark.png" });
  });
});

test.describe("ホームの試験と単語帳", () => {
  const review = { vocab: { feature: "vocab", due: 5, pending: 0 }, grammar: { feature: "grammar", due: 3, pending: 0 } };

  test("復習の帯・試験の見出し・「共通」は出さず、単語帳は試験と並ぶカードで出す", async ({ page }) => {
    await mockApi(page, { "GET /api/stats/summary": statsSummary(), "GET /api/review/summary": review });
    await page.goto(`${BASE}/`);

    await expect(page.getByRole("heading", { name: /今日の30分メニュー/ })).toBeVisible();
    await expect(page.getByText("どの試験の対策をしますか?")).toHaveCount(0);
    await expect(page.getByText("共通", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^語彙 5問/ })).toHaveCount(0);

    const card = page.getByRole("group", { name: "単語帳" });
    await expect(card).toBeVisible();
    // 試験のカードと同じ行に並ぶ(デスクトップ)
    const toeic = await page.getByRole("button", { name: /TOEIC L&R/ }).boundingBox();
    const wordbook = await card.boundingBox();
    expect(Math.abs(wordbook!.y - toeic!.y)).toBeLessThan(2);
    await page.locator("main, body").first().screenshot({ path: "test-results/home-desktop.png" });

    await card.getByRole("button", { name: "穴埋め" }).click();
    await expect(page).toHaveURL(/\/wordbook\/quiz\?type=fill$/);
  });

  test("スマホ・ダークでも単語帳のカードが見える", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mockApi(page, { "GET /api/stats/summary": statsSummary(), "GET /api/review/summary": review });
    await page.goto(`${BASE}/`);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    const card = page.getByRole("group", { name: "単語帳" });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: "test-results/home-mobile-dark.png", fullPage: true });
  });
});
