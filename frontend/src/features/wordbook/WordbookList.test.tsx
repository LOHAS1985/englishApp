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

const many = (count: number): WordbookWord[] =>
  Array.from({ length: count }, (_, i) =>
    word({ id: i + 1, word: `word${String(i + 1).padStart(3, "0")}`, meaningJa: `訳${i + 1}`, exampleEn: null, exampleJa: null }),
  );

function renderList() {
  return render(
    <MemoryRouter>
      <WordbookList />
    </MemoryRouter>,
  );
}

describe("単語一覧: 50語ずつの表示・絞り込み・並べ替え・検索", () => {
  it("最初は50語だけ出し、「もっと見る」で続きを出す", async () => {
    vi.mocked(fetchWordbookWords).mockResolvedValue(many(120));
    renderList();

    await screen.findByText("word001");
    expect(screen.getAllByRole("listitem")).toHaveLength(50);
    expect(screen.queryByText("word051")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /もっと見る\(あと 70 語\)/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(100);
    await userEvent.click(screen.getByRole("button", { name: /もっと見る\(あと 20 語\)/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(120);
    expect(screen.queryByRole("button", { name: /もっと見る/ })).toBeNull();
  });

  it("「今日の復習」と「未学習」で絞り込める", async () => {
    vi.mocked(fetchWordbookWords).mockResolvedValue([
      word({ id: 1, word: "fresh" }),
      word({ id: 2, word: "due", timesAsked: 2, timesCorrect: 1, nextDueDate: "2000-01-01" }),
      word({ id: 3, word: "later", timesAsked: 2, timesCorrect: 2, nextDueDate: "2999-01-01" }),
    ]);
    renderList();
    await screen.findByText("fresh");

    await userEvent.click(screen.getByRole("button", { name: /今日の復習 1/ }));
    expect(screen.getByText("due")).toBeTruthy();
    expect(screen.queryByText("fresh")).toBeNull();
    expect(screen.queryByText("later")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /未学習 1/ }));
    expect(screen.getByText("fresh")).toBeTruthy();
    expect(screen.queryByText("due")).toBeNull();
  });

  it("例文の中の語でも検索できる", async () => {
    vi.mocked(fetchWordbookWords).mockResolvedValue([
      word({ id: 1, word: "abandon", exampleEn: "They left the harbor at dawn." }),
      word({ id: 2, word: "boost", exampleEn: "Sales will grow next year." }),
    ]);
    renderList();
    await screen.findByText("abandon");

    await userEvent.type(screen.getByLabelText("検索"), "harbor");

    expect(screen.getByText("abandon")).toBeTruthy();
    expect(screen.queryByText("boost")).toBeNull();
  });

  it("ABC順に並べ替えられる", async () => {
    vi.mocked(fetchWordbookWords).mockResolvedValue([
      word({ id: 1, word: "cherry" }),
      word({ id: 2, word: "apple" }),
      word({ id: 3, word: "banana" }),
    ]);
    renderList();
    await screen.findByText("cherry");

    await userEvent.selectOptions(screen.getByLabelText("並べ替え"), "ALPHABET");

    const order = screen.getAllByRole("listitem").map((li) => li.querySelector("p")?.textContent?.replace("🔊", "").trim());
    expect(order).toEqual(["apple", "banana", "cherry"]);
  });

  it("出題の状況を出す(未出題・出題回数と正解回数)", async () => {
    vi.mocked(fetchWordbookWords).mockResolvedValue([
      word({ id: 1, word: "fresh" }),
      word({ id: 2, word: "asked", timesAsked: 3, timesCorrect: 2, nextDueDate: "2999-01-01" }),
    ]);
    renderList();

    expect(await screen.findByText("まだ出していません")).toBeTruthy();
    expect(screen.getByText(/出題 3回・正解 2回・次の復習 1\/1/)).toBeTruthy();
  });
});

describe("水準", () => {
  it("語の横に水準を出し、水準で絞り込める", async () => {
    vi.mocked(fetchWordbookWords).mockResolvedValue([
      word({ id: 1, word: "agenda", level: 1 }),
      word({ id: 2, word: "cajole", level: 4 }),
    ]);
    render(
      <MemoryRouter>
        <WordbookList />
      </MemoryRouter>,
    );
    expect(await screen.findByText("600点", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("930点", { selector: "span" })).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText("レベル"), "4");

    expect(screen.queryByText("agenda")).toBeNull();
    expect(screen.getByText("cajole")).toBeTruthy();
  });
});
