// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWordbookStats } from "../api/client";
import WordbookStatsSection from "./WordbookStatsSection";

vi.mock("../api/client", () => ({ fetchWordbookStats: vi.fn() }));

afterEach(cleanup);

const renderSection = () =>
  render(
    <MemoryRouter>
      <WordbookStatsSection />
    </MemoryRouter>,
  );

describe("MyPage の単語帳の欄", () => {
  it("習熟度の分布・直近7日の正答率・苦手な語を出す", async () => {
    vi.mocked(fetchWordbookStats).mockResolvedValue({
      total: 500,
      unseen: 431,
      learning: 60,
      mastered: 9,
      recentAsked: 40,
      recentCorrect: 30,
      weakest: [{ id: 7, word: "mitigate", meaningJa: "を軽減する", timesAsked: 4, timesCorrect: 1 }],
    });

    renderSection();

    expect(await screen.findByText("431")).toBeTruthy();
    expect(screen.getByText("60")).toBeTruthy();
    expect(screen.getByText("9")).toBeTruthy();
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText("mitigate")).toBeTruthy();
    expect(screen.getByText("1/4")).toBeTruthy();
  });

  it("まだ解いていなければ、正答率は出さず、苦手な語は無いと知らせる", async () => {
    vi.mocked(fetchWordbookStats).mockResolvedValue({
      total: 500,
      unseen: 500,
      learning: 0,
      mastered: 0,
      recentAsked: 0,
      recentCorrect: 0,
      weakest: [],
    });

    renderSection();

    expect(await screen.findByText("(まだ解いていません)")).toBeTruthy();
    expect(screen.getByText(/間違えた語はまだありません/)).toBeTruthy();
  });
});
