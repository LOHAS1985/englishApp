import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** API 呼び出しの共通処理: 通信の失敗の文言、待ちの上限、サーバー起動中の通知 */

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
  vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

const load = () => import("./http");

describe("send", () => {
  it("通信に失敗したら、ブラウザの英語のメッセージではなく日本語で知らせる", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { send } = await load();

    await expect(send("/api/level", "失敗")).rejects.toThrow(/通信できませんでした/);
  });

  it("待ちの上限を超えたら打ち切り、応答がないと知らせる", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        // 応答が返らないまま、打ち切り(abort)を待つ
        new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
      ),
    );
    const { send, REQUEST_TIMEOUT_MS } = await load();

    const result = send("/api/level", "失敗");
    const assertion = expect(result).rejects.toThrow(/サーバーから応答がありません/);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);

    await assertion;
  });

  it("5秒たっても応答がなければ「起動中」にし、応答が来たら元に戻す", async () => {
    let respond!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))));
    const { send, isServerWaking, subscribeServerWaking, WAKING_NOTICE_MS } = await load();
    const changes: boolean[] = [];
    subscribeServerWaking(() => changes.push(isServerWaking()));

    const result = send("/api/level", "失敗");
    expect(isServerWaking()).toBe(false);

    await vi.advanceTimersByTimeAsync(WAKING_NOTICE_MS + 1);
    expect(isServerWaking()).toBe(true);

    respond(new Response("{}", { status: 200 }));
    await result;
    expect(isServerWaking()).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it("すぐ応答が返れば、起動中の通知は出さない", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
    const { send, isServerWaking, subscribeServerWaking, WAKING_NOTICE_MS } = await load();
    const listener = vi.fn();
    subscribeServerWaking(listener);

    await send("/api/level", "失敗");
    await vi.advanceTimersByTimeAsync(WAKING_NOTICE_MS + 1);

    expect(isServerWaking()).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it("サーバーのエラー応答は、これまでどおり HttpError で返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "問題が見つかりません" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const { send, HttpError } = await load();

    const error = await send("/api/x", "失敗").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as InstanceType<typeof HttpError>).status).toBe(404);
    expect((error as Error).message).toBe("問題が見つかりません");
  });
});
