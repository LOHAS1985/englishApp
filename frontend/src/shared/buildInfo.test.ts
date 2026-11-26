import { describe, expect, it } from "vitest";
import { formatJst, isServerMismatch } from "./buildInfo";

describe("formatJst", () => {
  it("日本時間の日付と時刻にする", () => {
    // 2026-11-22 06:16 UTC は、日本時間では 15:16
    expect(formatJst("2026-11-22T06:16:00+00:00")).toBe("2026/11/22 15:16");
    expect(formatJst("2026-11-21T20:30:00Z")).toBe("2026/11/22 05:30");
  });

  it("空や不正な日時は空文字", () => {
    expect(formatJst("")).toBe("");
    expect(formatJst("not a date")).toBe("");
  });
});

describe("isServerMismatch(サーバーが別の版か)", () => {
  const head = "abc1234"; // この画面の HEAD(画面だけを変えたコミット)
  const backend = "def5678"; // 最後に backend/ を変えたコミット

  it("サーバーが、最後に backend/ を変えたコミットなら同じ版(画面だけの変更ではデプロイしないため)", () => {
    expect(isServerMismatch("def5678aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", [head, backend])).toBe(false);
  });

  it("サーバーが HEAD でも同じ版(手動で最新をデプロイしたときなど)", () => {
    expect(isServerMismatch("abc1234bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", [head, backend])).toBe(false);
  });

  it("どちらとも違えば別の版(バックエンドの変更がまだ反映されていない)", () => {
    expect(isServerMismatch("9999999ccccccccccccccccccccccccccccccccc", [head, backend])).toBe(true);
  });

  it("比べられないときは出さない", () => {
    expect(isServerMismatch(null, [head, backend])).toBe(false);
    expect(isServerMismatch("local", [head, backend])).toBe(false);
    expect(isServerMismatch("9999999", ["unknown", "unknown"])).toBe(false);
    // backend/ のコミットが分からなくても、HEAD だけで比べる
    expect(isServerMismatch("9999999", [head, "unknown"])).toBe(true);
  });
});
