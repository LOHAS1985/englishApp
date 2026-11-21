import { describe, expect, it, vi } from "vitest";
import { isChunkLoadError, reloadForStaleChunk } from "./staleChunk";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("isChunkLoadError", () => {
  it("ブラウザごとの動的 import の失敗を見分ける", () => {
    expect(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/a.js"))).toBe(true);
    expect(isChunkLoadError(new TypeError("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
  });

  it("ほかのエラーは対象にしない", () => {
    expect(isChunkLoadError(new Error("この形式の問題はまだ登録されていません: x"))).toBe(false);
    expect(isChunkLoadError(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("reloadForStaleChunk", () => {
  it("初回は読み込み直し、1分以内の2回目は読み込み直さない(繰り返し防止)", () => {
    const storage = memoryStorage();
    const reload = vi.fn();

    expect(reloadForStaleChunk(1_000_000, storage, reload, true)).toBe(true);
    expect(reloadForStaleChunk(1_030_000, storage, reload, true)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);

    // 1分以上たてば、また読み込み直せる
    expect(reloadForStaleChunk(1_061_000, storage, reload, true)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("オフラインのときは読み込み直さない(キャッシュの画面で同じ失敗を繰り返すだけのため)", () => {
    const reload = vi.fn();
    expect(reloadForStaleChunk(1_000_000, memoryStorage(), reload, false)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it("記録を保存できない環境では読み込み直さない", () => {
    const reload = vi.fn();
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(reloadForStaleChunk(1_000_000, broken, reload, true)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
