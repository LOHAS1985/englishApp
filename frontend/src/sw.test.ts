import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * public/sw.js(Service Worker)の動作確認。ブラウザの代わりに、メモリ上の簡易な Cache API と fetch で動かす。
 * 保存に失敗しても取れた応答を返すこと、保存したファイルが増え続けないことを確かめる。
 */

const SOURCE = readFileSync(join(__dirname, "..", "public", "sw.js"), "utf-8");
const ORIGIN = "https://example.test";
const BASE = "/englishApp/";

class FakeCache {
  readonly entries = new Map<string, Response>();
  putError: Error | null = null;

  async put(request: { url: string } | string, response: Response) {
    if (this.putError) throw this.putError;
    this.entries.set(typeof request === "string" ? new URL(request, ORIGIN).href : request.url, response);
  }

  async match(request: { url: string } | string) {
    return this.entries.get(typeof request === "string" ? new URL(request, ORIGIN).href : request.url);
  }

  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }));
  }

  async delete(request: { url: string }) {
    return this.entries.delete(request.url);
  }

  async addAll() {}
}

type Handler = (event: unknown) => void;

function load(fetchImpl: (request: { url: string }) => Promise<Response>) {
  const cache = new FakeCache();
  const handlers: Record<string, Handler> = {};
  const sandbox = {
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type: string, handler: Handler) => {
        handlers[type] = handler;
      },
    },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: fetchImpl,
    URL,
    Request: class {
      readonly url: string;
      constructor(url: string) {
        this.url = url;
      }
    },
    Response,
  };
  vm.runInNewContext(SOURCE, sandbox);

  /** 画面のリクエストを Service Worker に渡し、返す応答を受け取る */
  const request = async (url: string, mode = "no-cors") => {
    let responded: Promise<Response> | undefined;
    handlers.fetch({
      request: { method: "GET", url: `${ORIGIN}${url}`, mode },
      respondWith: (p: Promise<Response>) => {
        responded = p;
      },
    });
    return responded;
  };
  return { cache, request };
}

/** 同一オリジンの成功した応答(ブラウザの fetch が返す type は "basic") */
const ok = (body = "x") => {
  const response = new Response(body, { status: 200 });
  Object.defineProperty(response, "type", { value: "basic" });
  return response;
};

describe("Service Worker のキャッシュ", () => {
  it("ハッシュ付きのファイルは、取れたら保存し、2回目からは通信しない", async () => {
    let fetched = 0;
    const { cache, request } = load(async () => {
      fetched++;
      return ok("js");
    });

    const first = await request(`${BASE}assets/index-abc.js`);
    expect(await (await first!).text()).toBe("js");
    expect(cache.entries.has(`${ORIGIN}${BASE}assets/index-abc.js`)).toBe(true);

    await request(`${BASE}assets/index-abc.js`);
    expect(fetched).toBe(1);
  });

  it("保存に失敗しても(容量の上限など)、取れたファイルは返す", async () => {
    const { cache, request } = load(async () => ok("js"));
    cache.putError = new Error("QuotaExceededError");

    const response = await request(`${BASE}assets/index-abc.js`);

    expect(await (await response!).text()).toBe("js");
  });

  it("画面の遷移で保存に失敗しても、取れた最新の画面を返す", async () => {
    const { cache, request } = load(async () => ok("fresh index"));
    cache.putError = new Error("QuotaExceededError");

    const response = await request(`${BASE}mypage`, "navigate");

    expect(await (await response!).text()).toBe("fresh index");
  });

  it("保存したファイルが上限を超えたら、古い順に消し、app shell は残す", async () => {
    const { cache, request } = load(async () => ok("js"));
    await cache.put(`${BASE}index.html`, ok("shell"));
    // 上限(80)を超える数のファイルを順に開く
    for (let i = 0; i < 90; i++) {
      await request(`${BASE}assets/chunk-${i}.js`);
    }

    const assets = [...cache.entries.keys()].filter((url) => url.includes("/assets/"));
    expect(assets).toHaveLength(80);
    // 古いものから消え、新しいものが残る
    expect(cache.entries.has(`${ORIGIN}${BASE}assets/chunk-0.js`)).toBe(false);
    expect(cache.entries.has(`${ORIGIN}${BASE}assets/chunk-89.js`)).toBe(true);
    expect(cache.entries.has(`${ORIGIN}${BASE}index.html`)).toBe(true);
  });

  it("API と別オリジンは、保存も横取りもしない", async () => {
    const { cache, request } = load(async () => ok("json"));

    expect(await request(`${BASE}api/level`)).toBeUndefined();
    expect(cache.entries.size).toBe(0);
  });
});
