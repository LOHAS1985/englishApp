// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GrammarBook from "./GrammarBook";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));
vi.mock("./loadChapter", () => ({
  loadChapter: vi.fn(),
  hasChapter: (id: string) => id === "relative" || id === "tense",
}));

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const renderBook = () =>
  render(
    <MemoryRouter>
      <GrammarBook />
    </MemoryRouter>,
  );

describe("文法の教科書の目次", () => {
  it("24章を目次の順に出し、書かれていない章は準備中にしてリンクにしない", () => {
    renderBook();

    expect(screen.getAllByRole("listitem")).toHaveLength(24);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href")).filter((h) => h?.startsWith("/grammar-book/"));
    expect(hrefs).toEqual(["/grammar-book/tense", "/grammar-book/relative"]);
    // 目次の最初は「品詞と語形」、「文」は第2章
    expect(screen.getAllByRole("listitem")[0]?.textContent).toContain("品詞と語形");
    expect(screen.getAllByRole("listitem")[1]?.textContent).toContain("文");
    // 内容がまだ無い章
    expect(screen.queryByRole("link", { name: /品詞と語形/ })).toBeNull();
    expect(screen.getAllByText("準備中")).toHaveLength(22);
  });

  it("読了と確認問題の最高得点を出す", () => {
    localStorage.setItem(
      "grammarBook.progress",
      JSON.stringify({ relative: { read: true, quizBest: 8, quizTotal: 10 } }),
    );
    renderBook();

    const row = screen.getByRole("link", { name: /関係詞/ });
    expect(row.textContent).toContain("確認問題 8/10");
    expect(row.textContent).toContain("✓ 読了");
    expect(screen.getByText("読了 1 / 24章")).toBeTruthy();
  });
});
