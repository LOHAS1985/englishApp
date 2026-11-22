import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_SETTINGS,
  FONT_SCALES,
  parseDisplaySettings,
  resolveTheme,
} from "./displaySettings";

describe("parseDisplaySettings", () => {
  it("保存が無い・壊れているときは標準の表示に戻す", () => {
    expect(parseDisplaySettings(null)).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(parseDisplaySettings("not json")).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(parseDisplaySettings("123")).toEqual(DEFAULT_DISPLAY_SETTINGS);
    expect(parseDisplaySettings("null")).toEqual(DEFAULT_DISPLAY_SETTINGS);
  });

  it("保存した値を読み戻す", () => {
    expect(parseDisplaySettings(JSON.stringify({ fontScale: 150, fullWidth: true }))).toEqual({
      fontScale: 150,
      fullWidth: true,
      theme: "system",
    });
  });

  it("段階にない文字の大きさは標準にする(3段階になる前の保存値も、標準に戻る)", () => {
    expect(parseDisplaySettings(JSON.stringify({ fontScale: 999, fullWidth: "yes" }))).toEqual(
      DEFAULT_DISPLAY_SETTINGS,
    );
    expect(parseDisplaySettings(JSON.stringify({ fontScale: 130 })).fontScale).toBe(100);
  });

  it("文字の大きさは 標準・大きめ・特大 の3段階", () => {
    expect(FONT_SCALES).toEqual([100, 125, 150]);
  });
});

describe("theme", () => {
  it("保存した配色を読み戻し、不明な値は端末の設定に合わせる", () => {
    expect(parseDisplaySettings(JSON.stringify({ theme: "dark" })).theme).toBe("dark");
    expect(parseDisplaySettings(JSON.stringify({ theme: "blue" })).theme).toBe("system");
  });

  it("system は端末の設定で決め、dark / light はそのまま使う", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});
