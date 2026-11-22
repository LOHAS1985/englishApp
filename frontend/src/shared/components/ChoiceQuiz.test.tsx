// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerReadingWord, type GrammarAnswerResult, type GrammarQuestion } from "../../api/client";
import ChoiceQuiz from "./ChoiceQuiz";

// ヘッダーはレベルの取得で API を呼ぶので、この画面の確認には使わない
vi.mock("./Header", () => ({ default: () => null }));
vi.mock("../../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/client")>()),
  registerReadingWord: vi.fn(),
}));
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

describe("ChoiceQuiz: 単語帳に追加(語彙の問題)", () => {
  const VOCAB: GrammarQuestion = {
    id: "v0001",
    sentence: "The firm had to ------- the project after the funding was cut.",
    choices: [
      { label: "A", text: "abandon" },
      { label: "B", text: "reinforce" },
      { label: "C", text: "give up on" },
      { label: "D", text: "celebrate" },
    ],
    difficulty: 2,
  };

  function setupVocab(correctChoice: string, wordbookAdd = true) {
    const submitAnswer = vi.fn(
      async (): Promise<GrammarAnswerResult> => ({
        correct: true,
        correctChoice,
        explanation: "解説",
        translation: "訳",
      }),
    );
    render(
      <MemoryRouter>
        <ChoiceQuiz fetchQuestion={vi.fn(async () => VOCAB)} submitAnswer={submitAnswer} wordbookAdd={wordbookAdd} />
      </MemoryRouter>,
    );
    return userEvent.setup();
  }

  it("正解の語を、空所を正解で埋めた文を例文にして単語帳へ追加できる", async () => {
    vi.mocked(registerReadingWord).mockResolvedValue({
      added: true,
      word: { word: "abandon" } as never,
    });
    const user = setupVocab("A");
    await screen.findByText(/The firm had to/);
    await user.keyboard("1");

    await user.click(await screen.findByRole("button", { name: "単語帳に追加「abandon」" }));

    expect(registerReadingWord).toHaveBeenCalledWith(
      "abandon",
      "The firm had to abandon the project after the funding was cut.",
    );
    expect(await screen.findByText(/「abandon」を単語帳に追加しました/)).toBeTruthy();
    // 追加したあとは、同じ問題で二重に押せない
    expect((screen.getByRole("button", { name: "単語帳に追加「abandon」" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("正解が句(英単語1語でない)のときは、追加ボタンを出さない", async () => {
    const user = setupVocab("C");
    await screen.findByText(/The firm had to/);
    await user.keyboard("1");
    await screen.findByText("正解です");
    expect(screen.queryByRole("button", { name: /単語帳に追加/ })).toBeNull();
  });

  it("文法の問題(wordbookAdd を付けない画面)には出さない", async () => {
    const user = setupVocab("A", false);
    await screen.findByText(/The firm had to/);
    await user.keyboard("1");
    await screen.findByText("正解です");
    expect(screen.queryByRole("button", { name: /単語帳に追加/ })).toBeNull();
  });
});

describe("ChoiceQuiz: 次の問題の先読み", () => {
  it("解答する前には先読みせず、解答したあとに、解いた問題を除いて次を選ぶ", async () => {
    const fetchQuestion = vi.fn(async () => QUESTION);
    const submitAnswer = vi.fn(async () => result(true));
    render(
      <MemoryRouter>
        <ChoiceQuiz fetchQuestion={fetchQuestion} submitAnswer={submitAnswer} />
      </MemoryRouter>,
    );
    await screen.findByText(/She ____ to the office/);

    // 出題の直後は、まだ次を選ばない(いま解く問題の正誤を出題に反映するため)
    expect(fetchQuestion).toHaveBeenCalledTimes(1);

    await userEvent.keyboard("2");
    await screen.findByText("正解です");

    await waitFor(() => expect(fetchQuestion).toHaveBeenCalledTimes(2));
    expect(fetchQuestion).toHaveBeenLastCalledWith("g0001");
  });
});
