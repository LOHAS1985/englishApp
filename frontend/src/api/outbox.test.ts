import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { AnswerRow } from "./picker";

const API = "https://api.test";

/** localStorage の代わり(Node の環境には無いため、メモリ上の簡易実装を使う) */
class MemoryStorage {
  private items = new Map<string, string>();

  getItem(key: string) {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }

  removeItem(key: string) {
    this.items.delete(key);
  }

  clear() {
    this.items.clear();
  }

  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }

  get length() {
    return this.items.size;
  }
}

const row = (itemId: string, correct: boolean): AnswerRow => ({ itemId, questionNo: 1, correct });

/** outbox.ts はメモリ上の状態を持つので、テストごとに読み直して独立させる */
async function loadOutbox() {
  vi.resetModules();
  return import("./outbox");
}

let storage: MemoryStorage;
let fetchMock: Mock<typeof fetch>;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);
  // 端末未登録(401)のときに window へ通知するので、イベントを受けられる入れ物を用意する
  vi.stubGlobal("window", new EventTarget());
  vi.stubEnv("VITE_API_BASE_URL", API);
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const okResponse = () => new Response(null, { status: 200 });
const errorResponse = (status: number) =>
  new Response(JSON.stringify({ error: "エラー" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("enqueueAnswer と flushOutbox", () => {
  it("送れた記録は送信待ちの列から消え、正しい内容で送られる", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const { enqueueAnswer, flushOutbox, pendingCount } = await loadOutbox();

    const body = { questionId: "g1", choice: "B" };
    enqueueAnswer("grammar", "/api/grammar/answer", body, [row("g1", false)]);
    await flushOutbox();

    expect(pendingCount()).toBe(0);
    expect(storage.getItem("englishApp.outbox")).toBe("[]");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/api/grammar/answer`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it("サーバーが 5xx を返したら記録を残し、次の機会に再送する", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500)).mockResolvedValueOnce(okResponse());
    const { enqueueAnswer, flushOutbox, pendingCount } = await loadOutbox();

    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "g1" }, [row("g1", true)]);
    await flushOutbox();
    expect(pendingCount()).toBe(1);

    await flushOutbox();
    expect(pendingCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("通信に失敗(オフライン)したら記録を残す", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { enqueueAnswer, flushOutbox, pendingCount } = await loadOutbox();

    enqueueAnswer("vocab", "/api/vocab/answer", { wordId: 1 }, [row("1", true)]);
    await flushOutbox();

    expect(pendingCount()).toBe(1);
  });

  it("400(送り直しても通らない)は捨てる", async () => {
    fetchMock.mockResolvedValue(errorResponse(400));
    const { enqueueAnswer, flushOutbox, pendingCount } = await loadOutbox();

    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "gone" }, [row("gone", true)]);
    await flushOutbox();

    expect(pendingCount()).toBe(0);
  });

  it("401(端末が未登録)は捨てずに残す", async () => {
    fetchMock.mockResolvedValue(errorResponse(401));
    const { enqueueAnswer, flushOutbox, pendingCount } = await loadOutbox();

    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "g1" }, [row("g1", true)]);
    await flushOutbox();

    expect(pendingCount()).toBe(1);
  });

  it("送れなかった記録は、読み直した後(画面を開き直した後)も残っている", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const first = await loadOutbox();
    first.enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "g1" }, [row("g1", true)]);
    await first.flushOutbox();

    const second = await loadOutbox();
    expect(second.pendingCount()).toBe(1);
  });

  it("記録は古い順に送る", async () => {
    fetchMock.mockResolvedValue(okResponse());
    const { enqueueAnswer, flushOutbox } = await loadOutbox();

    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "first" }, [row("first", true)]);
    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "second" }, [row("second", true)]);
    await flushOutbox();

    const sentIds = fetchMock.mock.calls.map(
      ([, init]) => (JSON.parse(String(init?.body)) as { questionId: string }).questionId,
    );
    expect(sentIds).toEqual(["first", "second"]);
  });
});

describe("historyRows", () => {
  it("送信待ちの解答を、保存済みの履歴より前(新しい順)に入れる", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    storage.setItem("englishApp.history.grammar", JSON.stringify([row("old", true)]));
    const { enqueueAnswer, flushOutbox, historyRows } = await loadOutbox();

    const rowA = row("a", true);
    const rowB = row("b", false);
    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "a" }, [rowA]);
    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "b" }, [rowB]);
    // 別の機能の送信待ちは混ざらない
    enqueueAnswer("vocab", "/api/vocab/answer", { wordId: 9 }, [row("9", true)]);
    await flushOutbox();

    expect(historyRows("grammar")).toEqual([rowB, rowA, row("old", true)]);
  });

  it("送れた解答は保存済みの履歴の先頭に移り、送信待ちには残らない", async () => {
    fetchMock.mockResolvedValue(okResponse());
    storage.setItem("englishApp.history.grammar", JSON.stringify([row("old", true)]));
    const { enqueueAnswer, flushOutbox, historyRows, pendingCount } = await loadOutbox();

    const rowA = row("a", true);
    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "a" }, [rowA]);
    await flushOutbox();

    expect(pendingCount()).toBe(0);
    expect(historyRows("grammar")).toEqual([rowA, row("old", true)]);
    expect(JSON.parse(storage.getItem("englishApp.history.grammar") ?? "[]")).toEqual([
      rowA,
      row("old", true),
    ]);
  });
});

describe("保存データが壊れているとき", () => {
  it("送信待ちの列・履歴が配列でなくても、空として動く(出題が止まらない)", async () => {
    storage.setItem("englishApp.outbox", JSON.stringify({ not: "an array" }));
    storage.setItem("englishApp.history.grammar", "\"text\"");
    fetchMock.mockResolvedValue(okResponse());
    const { enqueueAnswer, flushOutbox, historyRows, pendingCount } = await loadOutbox();

    expect(pendingCount()).toBe(0);
    expect(historyRows("grammar")).toEqual([]);

    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "g1" }, [row("g1", true)]);
    await flushOutbox();
    expect(pendingCount()).toBe(0);
    expect(historyRows("grammar")).toEqual([row("g1", true)]);
  });
});

describe("refreshHistory", () => {
  const historyResponse = (rows: AnswerRow[]) =>
    new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });

  /** 後から返せる応答 */
  function deferredResponse() {
    let resolve!: (r: Response) => void;
    const promise = new Promise<Response>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  it("履歴の取得中に解答が送れたら、古い取得結果で履歴を上書きしない", async () => {
    const history = deferredResponse();
    fetchMock.mockImplementation((input) =>
      String(input).includes("/api/practice/history") ? history.promise : Promise.resolve(okResponse()),
    );
    const { enqueueAnswer, flushOutbox, historyRows, refreshHistory } = await loadOutbox();

    // 履歴の取得を始めた時点では、送信待ちは無い
    refreshHistory("grammar");
    // 取得の途中で解いた解答が送れる(サーバーの応答はまだ、その解答を含まない古い状態)
    enqueueAnswer("grammar", "/api/grammar/answer", { questionId: "new" }, [row("new", true)]);
    await flushOutbox();
    history.resolve(historyResponse([row("old", true)]));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(historyRows("grammar")).toEqual([row("new", true)]);
  });

  it("途中で何も送っていなければ、取得した履歴を保存する", async () => {
    fetchMock.mockResolvedValue(historyResponse([row("server", false)]));
    const { historyRows, refreshHistory } = await loadOutbox();

    refreshHistory("grammar");
    await vi.waitFor(() => expect(historyRows("grammar")).toEqual([row("server", false)]));
  });
});
