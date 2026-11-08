import { afterEach, describe, expect, it, vi } from "vitest";
import { shuffle } from "./shuffle";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("shuffle", () => {
  it("同じ要素を並べ替えるだけで、元の配列は変えない", () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect(result).not.toBe(original);
  });

  it("空の配列と1要素の配列はそのまま返す", () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(["a"])).toEqual(["a"]);
  });

  it("乱数が 0 のとき、Fisher–Yates の手順どおりに並ぶ", () => {
    // 乱数が常に 0 だと、末尾から順に先頭と入れ替える: [1,2,3] → [3,2,1] → [2,3,1]
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(shuffle([1, 2, 3])).toEqual([2, 3, 1]);
  });

  it("乱数が 1 に近いとき、並び順は変わらない", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(shuffle([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("3要素の全ての並びが出得る", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) seen.add(shuffle(["a", "b", "c"]).join(""));
    expect([...seen].sort()).toEqual(["abc", "acb", "bac", "bca", "cab", "cba"]);
  });
});
