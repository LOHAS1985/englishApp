// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDifficultyStats } from "../api/client";
import DifficultySection from "./DifficultySection";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  fetchDifficultyStats: vi.fn(),
}));

afterEach(cleanup);

describe("MyPage の難易度4の正答率", () => {
  it("正答率と目標までの差を出し、問題のない形式はそう書く", async () => {
    vi.mocked(fetchDifficultyStats).mockResolvedValue([
      { feature: "grammar", available: 0, answered: 0, correct: 0 },
      { feature: "listening", available: 120, answered: 40, correct: 30 },
      { feature: "reading", available: 0, answered: 0, correct: 0 },
      { feature: "vocab", available: 0, answered: 0, correct: 0 },
    ]);

    render(<DifficultySection />);

    expect(await screen.findByText("75%")).toBeTruthy();
    expect(screen.getByText("あと 10 点")).toBeTruthy();
    expect(screen.getAllByText("練習できません")).toHaveLength(3);
  });

  it("目標に届いたら「到達」と出す", async () => {
    vi.mocked(fetchDifficultyStats).mockResolvedValue([
      { feature: "listening", available: 120, answered: 20, correct: 18 },
      { feature: "grammar", available: 1, answered: 0, correct: 0 },
    ]);

    render(<DifficultySection />);

    expect(await screen.findByText("到達")).toBeTruthy();
    expect(screen.getByText("まだ解いていません")).toBeTruthy();
  });
});
