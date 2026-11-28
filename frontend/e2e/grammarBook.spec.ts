import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi.ts";

const BASE = "/englishApp";

test.describe("文法の教科書", () => {
  test("ホームから目次を開き、章をページで読み、確認問題に答えられる", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/`);

    await page.getByRole("button", { name: /文法の教科書/ }).click();
    await expect(page.getByRole("heading", { name: "文法の教科書" })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(24);

    await page.getByRole("link", { name: /関係詞/ }).click();
    await expect(page.getByRole("heading", { name: /^第19章 関係詞$/ })).toBeVisible();
    await expect(page.getByLabel("ページ", { exact: true })).toHaveText("1 / 28");

    // 次のページへ進むと、節の内容が出る。項目の例文も付く
    await page.getByRole("button", { name: "次のページ →" }).click();
    await expect(page.getByRole("heading", { name: "関係代名詞の基本:先行詞と格" })).toBeVisible();
    await expect(page.getByRole("list", { name: "例文" }).first()).toBeVisible();

    // 目次は導入のページにある。そこから まとめ・確認問題 のページへ行き、確認問題に答えると、すぐに正誤と解説が出る
    await page.getByRole("button", { name: "← 前のページ" }).click();
    await page.getByRole("navigation", { name: "この章の目次" }).getByRole("button", { name: /まとめ・確認問題/ }).click();
    const firstQuiz = page.getByRole("group", { name: "問題 1 の選択肢" });
    await firstQuiz.getByRole("button").first().click();
    await expect(page.getByRole("status").filter({ hasText: /正解です|不正解です/ }).first()).toBeVisible();
  });

  test("しおりに挟んだページは、リロードしても同じところから始まる", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/grammar-book/relative`);
    await expect(page.getByRole("heading", { name: /^第19章 関係詞$/ })).toBeVisible();

    await page.getByRole("button", { name: "次のページ →" }).click();
    await page.getByRole("button", { name: "ここまで読んだ(しおりを挟む)" }).click();
    await expect(page.getByRole("button", { name: "✓ ここにしおりを挟んでいます" })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("ページ", { exact: true })).toHaveText("2 / 28");
    await expect(page.getByRole("button", { name: "✓ ここにしおりを挟んでいます" })).toBeVisible();

    // 目次の一覧には、しおりの場所と読了が出る
    await page.goto(`${BASE}/grammar-book`);
    await expect(page.getByText("しおり 2/28")).toBeVisible();
  });

  test("問題の文法項目(?point=)を付けて開くと、該当する節のページから始まる", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/grammar-book/relative?point=${encodeURIComponent("関係副詞(where)")}`);

    await expect(page.getByRole("heading", { name: /関係副詞/, level: 2 })).toBeVisible();
    await expect(page.getByLabel("ページ", { exact: true })).not.toHaveText("1 / 28");
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
