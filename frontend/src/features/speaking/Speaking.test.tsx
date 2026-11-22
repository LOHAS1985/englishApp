// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSpeakingSet } from "../../api/client";
import Speaking from "./Speaking";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({ fetchSpeakingSet: vi.fn(), completeSpeakingSet: vi.fn() }));
vi.mock("./PartPractice", () => ({ default: () => null }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchSpeakingSet).mockReset();
});
afterEach(cleanup);

describe("スピーキング: 問題の取得に失敗したとき", () => {
  it("「もう一度試す」で取り直せる", async () => {
    vi.mocked(fetchSpeakingSet)
      .mockRejectedValueOnce(new Error("通信できませんでした"))
      .mockResolvedValueOnce({
        id: "s0001",
        title: "A Day at the Park",
        instruction: "Tell the story.",
        firstSentence: "One sunny morning, a family went to the park.",
        scenes: ["1", "2", "3", "4"],
        narrationSample: "...",
        questions: [],
      });

    render(<Speaking />);

    expect(await screen.findByText(/問題の取得に失敗しました/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

    expect(await screen.findByText("A Day at the Park")).toBeTruthy();
    expect(fetchSpeakingSet).toHaveBeenCalledTimes(2);
  });
});
