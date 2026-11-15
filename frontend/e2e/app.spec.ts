import { expect, test } from "@playwright/test";
import { FIXTURES, mockApi } from "./mockApi.ts";

const BASE = "/englishApp";

test.describe("表示サイズ", () => {
  test("文字の大きさ・全幅・ダークが反映され、リロードしても残る", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/mock`);

    await page.getByRole("button", { name: "文字を大きくする" }).click();
    await page.getByRole("button", { name: "文字を大きくする" }).click();
    await page.getByRole("button", { name: "全幅" }).click();
    await page.getByRole("button", { name: /^配色:/ }).click(); // 端末に合わせる → ダーク

    const html = page.locator("html");
    await expect(html).toHaveCSS("font-size", "20.8px"); // 130% × 16px
    await expect(html).toHaveAttribute("data-wide", "");
    await expect(html).toHaveAttribute("data-theme", "dark");
    const card = page.locator(".question-card");
    await expect(card).toHaveCSS("max-width", "none");
    await expect(card).toHaveCSS("background-color", "rgb(27, 34, 48)");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveCSS("font-size", "20.8px");
  });

  test("「自動」は画面の幅から文字の大きさを決めて全幅にする", async ({ page }) => {
    await mockApi(page);
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.goto(`${BASE}/mock`);

    await page.getByRole("button", { name: "自動" }).click();

    await expect(page.locator("html")).toHaveCSS("font-size", "24px"); // 1440〜1919px は 150%
    await expect(page.locator("html")).toHaveAttribute("data-wide", "");
  });
});

test.describe("文法の問題", () => {
  test("キーボードで解答して次へ進み、終了するとまとめが出る", async ({ page }) => {
    await mockApi(page, { "GET /api/practice/history": [] });
    await page.goto(`${BASE}/grammar`);
    await expect(page.getByText("1問目")).toBeVisible();

    await page.keyboard.press("1");
    await expect(page.getByRole("button", { name: "次の問題" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText("2問目")).toBeVisible();

    await page.keyboard.press("a");
    await page.getByRole("button", { name: "終了する" }).click();
    await expect(page.getByText("今回の練習")).toBeVisible();
    await expect(page.getByText("2問", { exact: true })).toBeVisible();
  });
});

test.describe("ライティング", () => {
  test("入力途中の答案は、リロードしても同じお題で復元される", async ({ page }) => {
    await mockApi(page, { "GET /api/writing/question": FIXTURES.writingQuestion });
    await page.goto(`${BASE}/writing?type=opinion`);
    await page.getByRole("button", { name: "問題を出題する" }).click();
    await page.getByRole("textbox").fill("I think cities should reduce cars.");

    await page.reload();

    await expect(page.getByText("Should cities ban cars from their centers?")).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveValue("I think cities should reduce cars.");
    await expect(page.getByText("前回の下書きを復元しました")).toBeVisible();
  });
});

test.describe("スピーキング", () => {
  test("文字起こしを AI 採点に送って結果を出し、下書きはリロードで復元される", async ({ page }) => {
    await mockApi(page, {
      "GET /api/speaking/question": FIXTURES.speakingSet,
      "POST /api/speaking/score": FIXTURES.speakingScore,
    });
    await page.goto(`${BASE}/speaking`);
    await expect(page.getByText("No.1 ナレーション(2分)")).toBeVisible();

    await page.getByRole("textbox").first().fill("One sunny morning, a family went to the park.");
    const requestPromise = page.waitForRequest((r) => r.url().endsWith("/api/speaking/score"));
    await page.getByRole("button", { name: "AI に採点してもらう" }).first().click();

    const request = await requestPromise;
    expect(request.postDataJSON()).toMatchObject({ setId: "s9999", part: 1 });
    await expect(page.getByText("内容はおおむね良いです。")).toBeVisible();
    await expect(page.getByText("あなたの答えを直した例")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox").first()).toHaveValue("One sunny morning, a family went to the park.");
    await expect(page.getByText("前回の文字起こしの下書きを復元しました")).toBeVisible();
  });
});

test.describe("模試", () => {
  test("途中でリロードしても、警告が出て、続きから再開できる", async ({ page }) => {
    await mockApi(page, { "POST /api/mock/start": FIXTURES.mockExam });
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.type());
      void dialog.accept();
    });
    await page.goto(`${BASE}/mock`);
    await page.getByRole("button", { name: "模試を始める" }).click();
    await expect(page.getByText("リスニング 1 / 1 セット")).toBeVisible();
    await page.getByRole("button", { name: /\(B\)/ }).click();

    await page.reload();

    expect(dialogs).toContain("beforeunload");
    await expect(page.getByText("中断した模試があります")).toBeVisible();
    await page.getByRole("button", { name: "続きから再開する" }).click();
    await expect(page.getByText("リスニング 1 / 1 セット")).toBeVisible();
    await expect(page.getByRole("button", { name: /\(B\)/ })).toHaveClass(/border-\[#8fae4e\]/);
  });

  test("中断した模試は破棄できる", async ({ page }) => {
    await mockApi(page, { "POST /api/mock/start": FIXTURES.mockExam });
    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto(`${BASE}/mock`);
    await page.getByRole("button", { name: "模試を始める" }).click();
    await expect(page.getByText("リスニング 1 / 1 セット")).toBeVisible();
    await page.reload();

    await page.getByRole("button", { name: "破棄する" }).click();

    await expect(page.getByText("中断した模試があります")).toBeHidden();
    await page.reload();
    await expect(page.getByText("中断した模試があります")).toBeHidden();
  });
});
