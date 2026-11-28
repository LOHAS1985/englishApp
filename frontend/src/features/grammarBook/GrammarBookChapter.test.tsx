// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Chapter, Item } from "../../content/grammarBook/types";
import GrammarBookChapter from "./GrammarBookChapter";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));

const item = (heading: string): Item => ({
  heading,
  explanation: `${heading}の説明です。`,
  examples: [{ en: `Example of **${heading}**.`, ja: `${heading}の例文の訳。` }],
});

// 節「関係代名詞」は4項目なので2ページ、節「関係副詞」は1ページ。全部で 導入・2・1・まとめ の5ページ
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
      items: [item("主格の who"), item("目的格の whom"), item("所有格の whose"), item("前置詞+which")],
      examNote: "空所の後ろに動詞があれば主格です。",
    },
    {
      id: "adverb",
      title: "関係副詞",
      intro: "関係副詞の基本です。",
      keywords: ["関係副詞"],
      items: [item("where")],
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

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
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

const pageLabel = () => screen.getByLabelText("ページ").textContent;

describe("文法の教科書の章をページで読む", () => {
  it("最初は導入のページ。目次から節・まとめへ飛べる", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");

    expect(await screen.findByRole("heading", { name: "第19章 関係詞" })).toBeTruthy();
    expect(pageLabel()).toBe("1 / 5");
    expect(screen.getByText("関係詞は、名詞に説明を足して文をつなぐことばです。")).toBeTruthy();

    const toc = within(screen.getByRole("navigation", { name: "この章の目次" }));
    await user.click(toc.getByRole("button", { name: "2. 関係副詞" }));
    expect(pageLabel()).toBe("4 / 5");
    expect(screen.getByRole("heading", { name: "関係副詞" })).toBeTruthy();
  });

  it("次のページ・前のページで、項目は3つまで。続きのページには(続き)と出す", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });

    await user.click(screen.getByRole("button", { name: "次のページ →" }));
    expect(pageLabel()).toBe("2 / 5");
    expect(screen.getByRole("heading", { name: "関係代名詞" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "主格の who" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "前置詞+which" })).toBeNull();
    expect(screen.getByText("関係代名詞の基本です。")).toBeTruthy();
    expect(screen.queryByText("試験での出方")).toBeNull();

    await user.click(screen.getByRole("button", { name: "次のページ →" }));
    expect(pageLabel()).toBe("3 / 5");
    expect(screen.getByText("(続き)")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "前置詞+which" })).toBeTruthy();
    // 試験での出方は、節の最後のページだけ
    expect(screen.getByText("試験での出方")).toBeTruthy();
    expect(screen.queryByText("関係代名詞の基本です。")).toBeNull();

    await user.click(screen.getByRole("button", { name: "← 前のページ" }));
    expect(pageLabel()).toBe("2 / 5");
  });

  it("最初のページでは「前のページ」を押せず、最後では「次のページ」を押せない", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });

    expect((screen.getByRole("button", { name: "← 前のページ" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "まとめ・確認問題(1問)" }));
    expect(pageLabel()).toBe("5 / 5");
    expect((screen.getByRole("button", { name: "次のページ →" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("問題の文法項目(?point=)を付けて開くと、該当する節のページから始まる", async () => {
    renderAt("/grammar-book/relative?point=" + encodeURIComponent("関係副詞(where)"));

    expect(await screen.findByRole("heading", { name: "関係副詞" })).toBeTruthy();
    expect(pageLabel()).toBe("4 / 5");
  });
});

describe("しおり", () => {
  it("ページに挟むと保存し、次に開くとそのページから始まる", async () => {
    const user = userEvent.setup();
    const { unmount } = renderUnmountable("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });

    await user.click(screen.getByRole("button", { name: "次のページ →" }));
    await user.click(screen.getByRole("button", { name: "ここまで読んだ(しおりを挟む)" }));
    expect(screen.getByRole("button", { name: "✓ ここにしおりを挟んでいます" }).getAttribute("aria-pressed")).toBe("true");
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative.bookmark).toEqual({ page: 1, total: 5 });
    unmount();

    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });
    expect(pageLabel()).toBe("2 / 5");
    expect(screen.getByRole("button", { name: "✓ ここにしおりを挟んでいます" })).toBeTruthy();
  });

  it("別のページを読んでいるときは、しおりの場所を出す", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });
    await user.click(screen.getByRole("button", { name: "次のページ →" }));
    await user.click(screen.getByRole("button", { name: "ここまで読んだ(しおりを挟む)" }));

    await user.click(screen.getByRole("button", { name: "次のページ →" }));
    expect(screen.getByText("しおり: 2 / 5 ページ")).toBeTruthy();
  });

  it("同じページでもう一度押すと、しおりを外す", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });

    await user.click(screen.getByRole("button", { name: "ここまで読んだ(しおりを挟む)" }));
    await user.click(screen.getByRole("button", { name: "✓ ここにしおりを挟んでいます" }));
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative?.bookmark).toBeUndefined();
  });
});

describe("まとめ・確認問題・読了", () => {
  it("確認問題に答えると、正誤と解説が出て、点数が保存される", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });
    await user.click(screen.getByRole("button", { name: "まとめ・確認問題(1問)" }));

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

  it("「読み終えた」を押すと保存され、もう一度押すと外れる", async () => {
    const user = userEvent.setup();
    renderAt("/grammar-book/relative");
    await screen.findByRole("heading", { name: "第19章 関係詞" });
    await user.click(screen.getByRole("button", { name: "まとめ・確認問題(1問)" }));

    await user.click(screen.getByRole("button", { name: "この章を読み終えた" }));
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative.read).toBe(true);
    await user.click(screen.getByRole("button", { name: "✓ 読み終えた" }));
    expect(JSON.parse(localStorage.getItem("grammarBook.progress") ?? "{}").relative.read).toBeUndefined();
  });
});

describe("章の状態", () => {
  it("まだ書かれていない章は、準備中と出す", async () => {
    renderAt("/grammar-book/tense");
    expect(await screen.findByText("この章は準備中です。")).toBeTruthy();
  });

  it("存在しない章 ID は、見つからないと出す", async () => {
    renderAt("/grammar-book/nothing");
    expect(await screen.findByText("この章は見つかりません。")).toBeTruthy();
  });
});

/** 同じ画面を一度消して開き直すテスト用(unmount を返す) */
function renderUnmountable(path: string) {
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/grammar-book/:chapterId" element={<GrammarBookChapter />} />
      </Routes>
    </MemoryRouter>,
  );
  return { unmount: result.unmount };
}
