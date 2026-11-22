import { expect, test, type Page } from "@playwright/test";
import { FIXTURES, mockApi } from "./mockApi.ts";

const BASE = "/englishApp";

/** ヘッダーの「メニュー」を開く(表示の設定と学習記録はここに入っている) */
async function openMenu(page: Page) {
  await page.getByRole("button", { name: "メニュー", exact: true }).click();
}

test.describe("表示サイズ", () => {
  test("文字の大きさ・全幅・ダークが反映され、リロードしても残る", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/mock`);

    await openMenu(page);
    await page.getByRole("group", { name: "文字の大きさ" }).getByRole("button", { name: "特大" }).click();
    await page.getByRole("button", { name: "問題を全幅に広げる" }).click();
    await page.getByRole("group", { name: "配色" }).getByRole("button", { name: "ダーク" }).click();
    await page.keyboard.press("Escape");

    const html = page.locator("html");
    await expect(html).toHaveCSS("font-size", "24px"); // 150% × 16px
    await expect(html).toHaveAttribute("data-wide", "");
    await expect(html).toHaveAttribute("data-theme", "dark");
    const card = page.locator(".question-card");
    await expect(card).toHaveCSS("max-width", "none");
    await expect(card).toHaveCSS("background-color", "rgb(27, 34, 48)");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(html).toHaveCSS("font-size", "24px");
  });

  test("メニューに学習記録があり、Esc で閉じる", async ({ page }) => {
    await mockApi(page);
    await page.goto(`${BASE}/mock`);

    await openMenu(page);
    await expect(page.getByRole("link", { name: "学習記録", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "学習記録", exact: true })).toHaveCount(0);
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

  test("時間が切れた後に再開しても、リスニングの時間は制限時間(45分)までしか送らない", async ({ page }) => {
    await page.clock.install();
    await mockApi(page, { "POST /api/mock/start": FIXTURES.mockExam });
    // 送った内容だけを確かめる(採点結果の画面は出さない)
    await page.route("**/api/mock/submit", (route) => route.fulfill({ status: 503, json: { error: "mock" } }));
    page.on("dialog", (dialog) => void dialog.accept());
    await page.goto(`${BASE}/mock`);
    await page.getByRole("button", { name: "模試を始める" }).click();
    await expect(page.getByText("リスニング 1 / 1 セット")).toBeVisible();

    // 画面を閉じて2時間たってから開き直す
    await page.reload();
    await page.clock.fastForward("02:00:00");
    await page.getByRole("button", { name: "続きから再開する" }).click();
    await page.clock.runFor(2000);

    const submitted = page.waitForRequest((r) => r.url().endsWith("/api/mock/submit"));
    await page.getByRole("button", { name: "提出する" }).click();
    const body = (await submitted).postDataJSON() as { sections: { skill: string; durationSeconds: number }[] };
    expect(body.sections.find((s) => s.skill === "listening")?.durationSeconds).toBe(45 * 60);
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
