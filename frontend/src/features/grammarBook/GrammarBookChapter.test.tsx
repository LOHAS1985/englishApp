// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chapter } from "../../content/grammarBook/types";
import GrammarBookChapter from "./GrammarBookChapter";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));

const FIXTURE: Chapter = {
  id: "relative",
  no: 19,
  title: "関係詞",
  lead: "関係詞は、名詞に説明を足して文をつなぐことばです。",
  sections: [
    {
      id: "pronoun",
      title: "関係代名詞",
      intro: "関係代名詞の基本です。",
      keywords: ["関係代名詞"],
      items: [
        {
          heading: "主格の who",
          explanation: "人を先行詞にして、**主語**の働きをします。\n\n・who\n・which",
          table: { caption: "格の表", headers: ["格", "人"], rows: [["主格", "who"]] },
          examples: [{ en: "The man **who** called is my boss.", ja: "電話をくれた男性は私の上司です。", note: "who は主語" }],
          cautions: ["× The man who he called ... は誤り"],
        },
      ],
      examNote: "空所の後ろに動詞があれば主格です。",
    },
    {
      id: "adverb",
      title: "関係副詞",
      intro: "関係副詞の基本です。",
      keywords: ["関係副詞"],
      items: [{ heading: "where", explanation: "場所を表す先行詞に使います。", examples: [{ en: "This is the town **where** I was born.", ja: "ここは私が生まれた町です。" }] }],
    },
  ],
  summary: ["先行詞が人か物かを見る"],
  quiz: [
    {
      id: "relative-q01",
      sentence: "The woman ------- lives next door is a doctor.",
      choices: [
        { label: "A", text: "who" },
        { label: "B", text: "which" },
        { label: "C", text: "whose" },
        { label: "D", text: "whom" },
      ],
      answer: "A",
      explanation: "先行詞が人で、後ろに動詞が続くので主格の who。",
      translation: "隣に住んでいる女性は医者です。",
    },
  ],
  related: ["preposition"],
};

vi.mock("./loadChapter", () => ({
  loadChapter: vi.fn(async (id: string) => (id === "relative" ? FIXTURE : null)),
  hasChapter: (id: string) => id === "relative",
}));

const scrolled: string[] = [];

beforeEach(() => {
  localStorage.clear();
  scrolled.length = 0;
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this.id);
  });
});
afterEach(cleanup);

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/grammar-book/:chapterId" element={<GrammarBookChapter />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("文法の教科書の章", () => {
  it("題名・導入・節・項目・例文・間違えやすい点・試験での出方・まとめ・確認問題を出す", async () => {
    renderAt("/grammar-book/relative");

    expect(await screen.findByRole("heading", { name: "第19章 関係詞" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "関係代名詞" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "主格の who" })).toBeTruthy();
    // ** で囲んだ語は太字になり、記号は表示されない
    expect(screen.getByText("主語", { selector: "strong" })).toBeTruthy();
    expect(screen.queryByText(/\*\*/)).toBeNull();
    // 空行の後の「・」は箇条書き
    expect(screen.getAllByRole("listitem").some((li) => li.textContent === "who")).toBe(true);
    expect(screen.getByText("電話をくれた男性は私の上司です。")).toBeTruthy();
    expect(screen.getByText("who は主語")).toBeTruthy();
    expect(screen.getByText("間違えやすい点")).toBeTruthy();
    expect(screen.getByText("試験での出方")).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "この章のまとめ" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "確認問題" })).toBeTruthy();
  });

  it("問題の文法項目(?point=)に合う節へ移動して、その節を目立たせる", async () => {
    renderAt("/grammar-book/relative?point=" + encodeURIComponent("関係副詞(where)"));

    await screen.findByRole("heading", { name: "第19章 関係詞" });
    await waitFor(() => expect(scrolled).toContain("sec-adverb"));
    expect(document.getElementById("sec-adverb")?.className).toContain("border-l-4");
    expect(document.getElementById("sec-pronoun")?.className).not.toContain("border-l-4");
  });

  it("「読み終えた」を押すと、ブラウザに保存される。もう一度押すと外れる", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });

    await user.click(screen.getByRole("button", { name: "この章を読み終えた" }));
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative.read).toBe(true);
    expect(screen.getByRole("button", { name: "✓ 読み終えた" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "✓ 読み終えた" }));
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative.read).toBeUndefined();
  });

  it("確認問題に答えると、正誤と解説が出て、点数が保存される", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });

    const quiz = within(screen.getByRole("group", { name: "問題 1 の選択肢" }));
    await user.click(quiz.getByRole("button", { name: /\(B\)\s*which/ }));

    expect(screen.getByText("不正解です(正解: A)")).toBeTruthy();
    expect(screen.getByText(/先行詞が人で、後ろに動詞が続くので主格の who/)).toBeTruthy();
    expect(screen.getByText("結果: 1問中 0問正解")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative).toMatchObject({
      quizBest: 0,
      quizTotal: 1,
    });
  });

  it("まだ書かれていない章は、準備中と出す", async () => {
    renderAt("/grammar-book/tense");
    expect(await screen.findByText("この章は準備中です。")).toBeTruthy();
  });

  it("存在しない章 ID は、見つからないと出す", async () => {
    renderAt("/grammar-book/nothing");
    expect(await screen.findByText("この章は見つかりません。")).toBeTruthy();
  });
});
