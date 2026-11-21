// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWordbookWords, setWordbookExample, type WordbookWord } from "../../api/client";
import WordbookList from "./WordbookList";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({
  fetchWordbookWords: vi.fn(),
  setWordbookExample: vi.fn(),
  addWordbookWord: vi.fn(),
  deleteWordbookWord: vi.fn(),
  setWordbookColor: vi.fn(),
  setWordbookMeaning: vi.fn(),
}));

const word = (overrides: Partial<WordbookWord> = {}): WordbookWord => ({
  id: 1,
  word: "abandon",
  meaningJa: "を捨てる",
  exampleEn: "We abandon it.",
  exampleAnswer: "abandon",
  exampleJa: "私たちはそれを捨てる。",
  source: "BUNDLED",
  color: "NONE",
  translationStatus: "DONE",
  createdAt: "2026-11-01T00:00:00",
  timesAsked: 0,
  timesCorrect: 0,
  nextDueDate: null,
  ...overrides,
});

beforeEach(() => {
  vi.mocked(fetchWordbookWords).mockReset().mockResolvedValue([word()]);
  vi.mocked(setWordbookExample).mockReset();
});
afterEach(cleanup);

describe("単語一覧: 例文を直す", () => {
  it("入力した内容で保存すると、一覧の例文が置き換わる", async () => {
    vi.mocked(setWordbookExample).mockResolvedValue(
      word({ exampleEn: "They had to abandon the plan.", exampleJa: "彼らは計画を断念した。" }),
    );
    render(
      <MemoryRouter>
        <WordbookList />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "例文を直す" }));
    const en = screen.getByLabelText("例文(英語)");
    await userEvent.clear(en);
    await userEvent.type(en, "They had to abandon the plan.");
    const ja = screen.getByLabelText("例文の訳");
    await userEvent.clear(ja);
    await userEvent.type(ja, "彼らは計画を断念した。");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(setWordbookExample).toHaveBeenCalledWith(
      1,
      "They had to abandon the plan.",
      "abandon",
      "彼らは計画を断念した。",
    );
    expect(await screen.findByText("They had to abandon the plan.")).toBeTruthy();
    expect(screen.queryByLabelText("例文(英語)")).toBeNull();
  });

  it("サーバーが断ったら(空欄の語が例文に無いなど)、理由を出して編集を続けられる", async () => {
    vi.mocked(setWordbookExample).mockRejectedValue(new Error("空欄にする語が例文の中に見つかりません"));
    render(
      <MemoryRouter>
        <WordbookList />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "例文を直す" }));
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("空欄にする語が例文の中に見つかりません")).toBeTruthy();
    expect(screen.getByLabelText("例文(英語)")).toBeTruthy();
  });
});
