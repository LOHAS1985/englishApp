// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GrammarAnswerResult, GrammarQuestion } from "../../api/client";
import ChoiceQuiz from "./ChoiceQuiz";

vi.mock("./Header", () => ({ default: () => null }));
vi.mock("../shuffle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../shuffle")>()),
  shuffle: <T,>(items: T[]) => items,
}));

const question = (point?: string): GrammarQuestion => ({
  id: "g0001",
  sentence: "The man ____ called is my boss.",
  choices: [
    { label: "A", text: "who" },
    { label: "B", text: "whom" },
    { label: "C", text: "whose" },
    { label: "D", text: "which" },
  ],
  difficulty: 2,
  point,
});

const result: GrammarAnswerResult = { correct: true, correctChoice: "A", explanation: "主格。", translation: "訳。" };

afterEach(cleanup);

async function answered(q: GrammarQuestion, bookLink: boolean) {
  render(
    <MemoryRouter>
      <ChoiceQuiz fetchQuestion={async () => q} submitAnswer={async () => result} bookLink={bookLink} />
    </MemoryRouter>,
  );
  await screen.findByText(/The man ____ called/);
  await userEvent.setup().keyboard("1");
  await screen.findByText("正解です");
}

describe("解答後の教科書へのリンク", () => {
  it("文法の問題は、文法項目に合う章と節へのリンクを出す", async () => {
    await answered(question("関係代名詞(主格・人)"), true);

    const link = screen.getByRole("link", { name: "この項目の解説を読む →" });
    expect(link.getAttribute("href")).toBe(`/grammar-book/relative?point=${encodeURIComponent("関係代名詞(主格・人)")}`);
  });

  it("語彙の問題・教科書の範囲外の項目・point が無い問題は、リンクを出さない", async () => {
    await answered(question("語彙(動詞)"), true);
    expect(screen.queryByRole("link", { name: /この項目の解説/ })).toBeNull();
    cleanup();

    await answered(question(undefined), true);
    expect(screen.queryByRole("link", { name: /この項目の解説/ })).toBeNull();
    cleanup();

    // 語彙画面(bookLink を渡さない)では、point が「動詞」でも出さない
    await answered(question("動詞(ビジネス)"), false);
    expect(screen.queryByRole("link", { name: /この項目の解説/ })).toBeNull();
  });
});

describe("まだ書いていない章へは、リンクを出さない", () => {
  it("書けている章(品詞と語形)にはリンクする。未執筆の助動詞(modal)には出さない", async () => {
    await answered(question("品詞(副詞)"), true);
    expect(screen.getByRole("link", { name: "この項目の解説を読む →" }).getAttribute("href")).toBe("/grammar-book/parts-of-speech?point=" + encodeURIComponent("品詞(副詞)"));
    cleanup();

    await answered(question("助動詞(need not have)"), true);
    expect(screen.queryByRole("link", { name: /この項目の解説/ })).toBeNull();
  });
});
