import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi.ts";

const BASE = "/englishApp";

test.describe("文法の教科書", () => {
  test("ホームから目次を開き、章を読んで、確認問題に答えられる", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/`);

    await page.getByRole("button", { name: /文法の教科書/ }).click();
    await expect(page.getByRole("heading", { name: "文法の教科書" })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(24);

    await page.getByRole("link", { name: /関係詞/ }).click();
    await expect(page.getByRole("heading", { name: /^第19章 関係詞$/ })).toBeVisible();
    // 各項目には例文が付く
    await expect(page.getByRole("list", { name: "例文" }).first()).toBeVisible();

    // 確認問題に答えると、すぐに正誤と解説が出る
    const firstQuiz = page.getByRole("group", { name: "問題 1 の選択肢" });
    await firstQuiz.getByRole("button").first().click();
    await expect(page.getByRole("status").filter({ hasText: /正解です|不正解です/ }).first()).toBeVisible();

    // 読了は、リロードしても残る
    await page.getByRole("button", { name: "この章を読み終えた" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "✓ 読み終えた" })).toBeVisible();
  });

  test("問題の文法項目(?point=)を付けて開くと、該当する節が目立つ", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/grammar-book/relative?point=${encodeURIComponent("関係副詞(where)")}`);

    await expect(page.getByRole("heading", { name: /^第19章 関係詞$/ })).toBeVisible();
    const highlighted = page.locator("section[id^='sec-'].border-l-4");
    await expect(highlighted).toHaveCount(1);
    await expect(highlighted.getByRole("heading", { level: 2 })).toContainText("関係副詞");
  });

  test("スマホの幅でも横にはみ出さない", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await mockApi(page);
    await page.goto(`${BASE}/grammar-book/relative`);

    await expect(page.getByRole("heading", { name: /^第19章 関係詞$/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
