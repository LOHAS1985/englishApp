import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const graded = { score: 1, total: 1, results: [], script: null, translation: null };

vi.mock("./localQuestions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./localQuestions")>()),
  gradeQuestionSet: vi.fn(async () => graded),
}));

beforeEach(() => {
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("submitPracticeAnswers(リスニング)", () => {
  it("台本の取得を待たずに採点結果を返し、台本は取れたら onReveal で渡す", async () => {
    let respond!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((res) => (respond = res))));
    const { submitPracticeAnswers } = await import("./client");
    const onReveal = vi.fn();

    // サーバーが応答しない間も、採点結果はすぐ返る
    const result = await submitPracticeAnswers("listening", "l1", ["A"], 30, undefined, onReveal);
    expect(result).toEqual(graded);
    expect(onReveal).not.toHaveBeenCalled();

    respond(new Response(JSON.stringify({ script: "Man: Hi.", translation: "やあ" }), { status: 200 }));
    await vi.waitFor(() => expect(onReveal).toHaveBeenCalledWith({ script: "Man: Hi.", translation: "やあ" }));
  });

  it("台本を取れなくても、採点結果は返り、エラーにならない", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    const { submitPracticeAnswers } = await import("./client");
    const onReveal = vi.fn();

    await expect(submitPracticeAnswers("listening", "l1", ["A"], 30, undefined, onReveal)).resolves.toEqual(graded);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("読解では台本を取りに行かない", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { submitPracticeAnswers } = await import("./client");

    await submitPracticeAnswers("reading", "r1", ["A"], 30);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
