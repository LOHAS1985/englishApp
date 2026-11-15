// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GrammarAnswerResult, GrammarQuestion } from "../../api/client";
import ChoiceQuiz from "./ChoiceQuiz";

// ヘッダーはレベルの取得で API を呼ぶので、この画面の確認には使わない
vi.mock("./Header", () => ({ default: () => null }));
// 選択肢の並びは毎回ランダムなので、テストでは並べ替えない(A〜D が問題集の並びのままになる)
vi.mock("../shuffle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shuffle")>()),
  shuffle: <T,>(items: T[]) => items,
}));

const QUESTION: GrammarQuestion = {
  id: "g0001",
  sentence: "She ____ to the office every day.",
  choices: [
    { label: "A", text: "go" },
    { label: "B", text: "goes" },
    { label: "C", text: "going" },
    { label: "D", text: "gone" },
  ],
  difficulty: 2,
};

const result = (correct: boolean): GrammarAnswerResult => ({
  correct,
  correctChoice: "B",
  explanation: "三単現の s。",
  translation: "彼女は毎日会社に行く。",
});

afterEach(cleanup);

function setup(answerCorrect: boolean) {
  const fetchQuestion = vi.fn(async () => QUESTION);
  const submitAnswer = vi.fn(async () => result(answerCorrect));
  render(
    <MemoryRouter>
      <ChoiceQuiz fetchQuestion={fetchQuestion} submitAnswer={submitAnswer} />
    </MemoryRouter>,
  );
  return { fetchQuestion, submitAnswer, user: userEvent.setup() };
}

describe("ChoiceQuiz のキーボード操作", () => {
  it("数字キーで選択肢を選んで解答し、次の問題にフォーカスが移る", async () => {
    const { submitAnswer, user } = setup(true);
    await screen.findByText(/She ____ to the office/);

    await user.keyboard("2");

    await waitFor(() => expect(submitAnswer).toHaveBeenCalledWith("g0001", "B", expect.any(Number)));
    expect(await screen.findByText("正解です")).toBeTruthy();
    // 正誤は色だけでなく文字でも示す
    expect(screen.getByText("✓ 正解")).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "次の問題" })));
  });

  it("英字キーでも選べる。選択肢の数を超えるキーは無視する", async () => {
    const { submitAnswer, user } = setup(false);
    await screen.findByText(/She ____ to the office/);

    await user.keyboard("9");
    await user.keyboard("e");
    expect(submitAnswer).not.toHaveBeenCalled();

    await user.keyboard("a");
    await waitFor(() => expect(submitAnswer).toHaveBeenCalledWith("g0001", "A", expect.any(Number)));
    expect(await screen.findByText("✕ あなたの選択")).toBeTruthy();
  });

  it("解答したあとは、キーを押しても二重に解答しない", async () => {
    const { submitAnswer, user } = setup(true);
    await screen.findByText(/She ____ to the office/);

    await user.keyboard("1");
    await screen.findByText("正解です");
    await user.keyboard("3");

    expect(submitAnswer).toHaveBeenCalledTimes(1);
  });
});

describe("ChoiceQuiz の終了時のまとめ", () => {
  it("解いた問題があれば、終了するとまとめを出し、続けるで問題に戻る", async () => {
    const { user } = setup(true);
    await screen.findByText(/She ____ to the office/);
    await user.keyboard("2");
    await screen.findByText("正解です");

    await user.click(screen.getByRole("button", { name: "終了する" }));

    expect(await screen.findByText("今回の練習")).toBeTruthy();
    expect(screen.getByText("1問")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "続ける" }));
    await waitFor(() => expect(screen.queryByText("今回の練習")).toBeNull());
  });
});
