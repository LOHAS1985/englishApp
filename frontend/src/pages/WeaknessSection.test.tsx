// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWeakness, type WeaknessItem } from "../api/client";
import WeaknessSection from "./WeaknessSection";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  fetchWeakness: vi.fn(),
}));

afterEach(cleanup);

const item = (over: Partial<WeaknessItem>): WeaknessItem => ({
  feature: "grammar",
  type: "toeic-part5",
  category: "関係詞",
  correct: 2,
  total: 8,
  ...over,
});

describe("弱点分析の教科書リンク", () => {
  it("文法の分野には、該当する章へのリンクを出す。範囲外の分野や読解には出さない", async () => {
    vi.mocked(fetchWeakness).mockResolvedValue([
      item({ category: "関係詞" }),
      item({ category: "語彙・コロケーション" }),
      item({ feature: "reading", type: "toeic-part7", category: "推測問題" }),
    ]);
    render(
      <MemoryRouter>
        <WeaknessSection />
      </MemoryRouter>,
    );

    await screen.findByText("弱点分析(分野・設問タイプ別)");
    const links = screen.getAllByRole("link", { name: "教科書で学ぶ" });
    // 苦手の一覧と「全分類」の両方に出るが、すべて関係詞の章へ
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link.getAttribute("href")).toBe("/grammar-book/relative");
  });
});
