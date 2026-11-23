// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWordbookChoice,
  fetchWordbookFill,
  submitWordbookChoice,
  type WordbookAnswerResult,
  type WordbookChoiceQuestion,
} from "../../api/client";
import WordbookQuiz from "./WordbookQuiz";

// ヘッダーはレベルの取得で API を呼ぶので、この画面の確認には使わない
vi.mock("../../shared/components/Header", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({
  fetchWordbookChoice: vi.fn(),
  fetchWordbookFill: vi.fn(),
  submitWordbookChoice: vi.fn(),
  submitWordbookFill: vi.fn(),
  setWordbookColor: vi.fn(),
}));

const question = (wordId: number, word: string): WordbookChoiceQuestion => ({
  wordId,
  word,
  choices: ["延期する", "促進する", "放棄する", "緩和する"],
});

const RESULT: WordbookAnswerResult = {
  correct: true,
  word: "defer",
  meaningJa: "延期する",
  correctAnswer: "延期する",
  exampleEn: null,
  exampleJa: null,
  color: "NONE",
};

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

function renderQuiz() {
  return render(
    <MemoryRouter initialEntries={["/wordbook/quiz?type=choice"]}>
      <WordbookQuiz />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(fetchWordbookChoice).mockReset();
  vi.mocked(submitWordbookChoice).mockReset().mockResolvedValue(RESULT);
});
afterEach(cleanup);

describe("単語帳の4択: 次の問題の先読み", () => {
  it("問題を出した時点で次の問題を取りに行き、「次の問題」で待たずに出す", async () => {
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockResolvedValueOnce(question(2, "alleviate"))
      .mockReturnValue(new Promise(() => {}));

    renderQuiz();
    await waitFor(() => expect(screen.getByText("defer")).toBeTruthy());

    // 解答する前から、表示中の語を除いて次の問題を取りに行っている
    await waitFor(() => expect(fetchWordbookChoice).toHaveBeenCalledTimes(2));
    expect(vi.mocked(fetchWordbookChoice).mock.calls[1]?.[0]).toEqual([1]);

    await userEvent.click(screen.getByRole("button", { name: "延期する" }));
    await userEvent.click(await screen.findByRole("button", { name: "次の問題" }));

    expect(await screen.findByText("alleviate")).toBeTruthy();
    expect(screen.getByText("2問目")).toBeTruthy();
    // 「次の問題」で取り直していない(2問目を出したので、3問目の先読みが1回増えるだけ)
    expect(fetchWordbookChoice).toHaveBeenCalledTimes(3);
  });

  it("先読みが終わる前に「次の問題」を押したら、先読みの結果を待って出す", async () => {
    const prefetch = deferred<WordbookChoiceQuestion>();
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockReturnValueOnce(prefetch.promise)
      .mockReturnValue(new Promise(() => {}));

    renderQuiz();
    await userEvent.click(await screen.findByRole("button", { name: "延期する" }));
    await userEvent.click(await screen.findByRole("button", { name: "次の問題" }));
    expect(screen.getByText("出題中…")).toBeTruthy();

    prefetch.resolve(question(2, "alleviate"));

    expect(await screen.findByText("alleviate")).toBeTruthy();
  });

  it("先読みに失敗していたら、「次の問題」でその場で取り直す", async () => {
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockRejectedValueOnce(new Error("通信に失敗しました"))
      .mockResolvedValueOnce(question(3, "relinquish"))
      .mockReturnValue(new Promise(() => {}));

    renderQuiz();
    await userEvent.click(await screen.findByRole("button", { name: "延期する" }));
    await userEvent.click(await screen.findByRole("button", { name: "次の問題" }));

    expect(await screen.findByText("relinquish")).toBeTruthy();
    // 先読みの失敗はエラーとして出さない
    expect(screen.queryByText("通信に失敗しました")).toBeNull();
  });
});

describe("単語帳: 読み方の再生", () => {
  const spoken: string[] = [];

  beforeEach(() => {
    spoken.length = 0;
    // jsdom には読み上げが無いので、話した文字列を記録するだけの代わりを置く
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        lang = "";
        rate = 1;
        voice: unknown = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    );
    vi.stubGlobal("speechSynthesis", {
      getVoices: () => [{ name: "Samantha", lang: "en-US" }],
      cancel: vi.fn(),
      speak: (u: { text: string }) => spoken.push(u.text),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("4択は問題の英単語を読み上げられ、正解の表示でも再生できる", async () => {
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockReturnValue(new Promise(() => {}));

    renderQuiz();
    await userEvent.click(await screen.findByRole("button", { name: "「defer」の読み方を再生" }));
    await waitFor(() => expect(spoken).toEqual(["defer"]));

    await userEvent.click(screen.getByRole("button", { name: "延期する" }));
    await screen.findByRole("button", { name: "次の問題" });
    // 問題の英単語と、正解の表示の2か所にある
    const buttons = screen.getAllByRole("button", { name: "「defer」の読み方を再生" });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[1]!);
    await waitFor(() => expect(spoken).toEqual(["defer", "defer"]));
  });

  it("読み上げが使えないブラウザでは、再生ボタンを出さない", async () => {
    vi.unstubAllGlobals();
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockReturnValue(new Promise(() => {}));

    renderQuiz();
    await screen.findByText("defer");
    expect(screen.queryByRole("button", { name: /読み方を再生/ })).toBeNull();
  });
});

describe("単語帳の穴埋め: ヒント", () => {
  it("答えの頭文字と文字数を出す(同義語のどれも入りそうな空欄でも答えが1つに決まる)", async () => {
    vi.mocked(fetchWordbookFill)
      .mockResolvedValueOnce({
        wordId: 1,
        sentence: "Attendance is _____ for all new employees.",
        translation: "出席は、すべての新入社員に義務づけられている。",
        hint: "m________ (9文字)",
      })
      .mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={["/wordbook/quiz?type=fill"]}>
        <WordbookQuiz />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Attendance is _____ for all new employees.")).toBeTruthy();
    expect(screen.getByText("m________ (9文字)")).toBeTruthy();
  });
});

describe("単語帳の4択: 採点に失敗したとき", () => {
  it("問題を消さず、選び直せる", async () => {
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockReturnValue(new Promise(() => {}));
    vi.mocked(submitWordbookChoice)
      .mockRejectedValueOnce(new Error("通信できませんでした"))
      .mockResolvedValueOnce(RESULT);

    renderQuiz();
    await screen.findByText("defer");

    await userEvent.click(screen.getByRole("button", { name: "延期する" }));

    expect((await screen.findByRole("alert")).textContent).toContain("通信できませんでした");
    // 問題と選択肢は残り、もう一度選べる
    expect(screen.getByText("defer")).toBeTruthy();
    const again = screen.getByRole("button", { name: "延期する" }) as HTMLButtonElement;
    expect(again.disabled).toBe(false);

    await userEvent.click(again);
    await waitFor(() => expect(submitWordbookChoice).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});

describe("単語帳: 品詞ごとの意味", () => {
  it("解答後に、出題の意味のほかの品詞・意味も出す(remedy は名詞と動詞)", async () => {
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "remedy"))
      .mockReturnValue(new Promise(() => {}));
    vi.mocked(submitWordbookChoice).mockResolvedValue({
      ...RESULT,
      word: "remedy",
      meaningJa: "改善策、治療法",
      correctAnswer: "延期する",
      senses: [
        { pos: "名詞", meaningJa: "治療法、改善策" },
        { pos: "動詞", meaningJa: "を改善する、是正する" },
      ],
    });

    renderQuiz();
    // 解答前は出さない(4択の答えが分かってしまうため)
    await screen.findByText("remedy");
    expect(screen.queryByText("を改善する、是正する")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "延期する" }));

    expect(await screen.findByText("を改善する、是正する")).toBeTruthy();
    expect(screen.getByText("動詞")).toBeTruthy();
    expect(screen.getByText("名詞")).toBeTruthy();
  });

  it("品詞の情報が無い語(同梱語に無い語)では、何も出さない", async () => {
    vi.mocked(fetchWordbookChoice)
      .mockResolvedValueOnce(question(1, "defer"))
      .mockReturnValue(new Promise(() => {}));

    renderQuiz();
    await userEvent.click(await screen.findByRole("button", { name: "延期する" }));
    await screen.findByRole("button", { name: "次の問題" });

    expect(screen.queryByLabelText("品詞ごとの主な意味")).toBeNull();
  });
});
