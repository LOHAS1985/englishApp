import { describe, expect, it } from "vitest";
import {
  DEFAULT_DISPLAY_SETTINGS,
  FONT_SCALES,
  fitFontScale,
  nextTheme,
  parseDisplaySettings,
  resolveTheme,
  stepFontScale,
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

  it("段階にない文字の大きさは標準にする(極端に大きい値で画面が崩れないように)", () => {
    expect(parseDisplaySettings(JSON.stringify({ fontScale: 999, fullWidth: "yes" }))).toEqual(
      DEFAULT_DISPLAY_SETTINGS,
    );
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

  it("system → dark → light → system の順に切り替える", () => {
    expect(nextTheme("system")).toBe("dark");
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("system");
  });
});

describe("fitFontScale", () => {
  it("画面が広いほど大きくし、スマホは標準のままにする", () => {
    expect(fitFontScale(390)).toBe(100);
    expect(fitFontScale(768)).toBe(115);
    expect(fitFontScale(1280)).toBe(130);
    expect(fitFontScale(1920)).toBe(175);
    expect(fitFontScale(3840)).toBe(200);
  });

  it("返す値は必ず段階のどれかになる", () => {
    for (const width of [0, 639, 640, 1023, 1024, 1439, 1440, 1919, 1920, 2559, 2560, 10000]) {
      expect(FONT_SCALES).toContain(fitFontScale(width));
    }
  });
});

describe("stepFontScale", () => {
  it("1段階ずつ大きく・小さくする", () => {
    expect(stepFontScale(100, 1)).toBe(115);
    expect(stepFontScale(130, -1)).toBe(115);
  });

  it("端に達したら動かさない", () => {
    expect(stepFontScale(FONT_SCALES[0], -1)).toBe(FONT_SCALES[0]);
    expect(stepFontScale(FONT_SCALES[FONT_SCALES.length - 1], 1)).toBe(FONT_SCALES[FONT_SCALES.length - 1]);
  });

  it("段階にない値からは、標準を起点に動かす", () => {
    expect(stepFontScale(123, 1)).toBe(115);
  });
});
