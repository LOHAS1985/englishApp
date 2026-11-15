import { afterEach, describe, expect, it, vi } from "vitest";
import { canLoadAudio, pregeneratedAudioUrl } from "./audioUrl";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("pregeneratedAudioUrl", () => {
  it("セット ID から、GitHub Releases の音声の URL を作る", () => {
    expect(pregeneratedAudioUrl("l0467")).toBe(
      "https://github.com/LOHAS1985/englishApp/releases/download/audio-1/l0467.mp3",
    );
  });

  it("リリースは ID 1000 ごとに分ける(1つのリリースは1000ファイルまで)", () => {
    expect(pregeneratedAudioUrl("l0001")).toContain("/audio-1/");
    expect(pregeneratedAudioUrl("l0999")).toContain("/audio-1/");
    expect(pregeneratedAudioUrl("l1000")).toContain("/audio-2/");
    expect(pregeneratedAudioUrl("l1999")).toContain("/audio-2/");
    expect(pregeneratedAudioUrl("l2000")).toContain("/audio-3/");
  });

  it("リスニングのセット ID でなければ null", () => {
    expect(pregeneratedAudioUrl("r0001")).toBeNull();
    expect(pregeneratedAudioUrl("")).toBeNull();
    expect(pregeneratedAudioUrl("l12a")).toBeNull();
  });
});

/** 読み込みの結果を、テストから起こせる Audio の代わり */
class FakeAudio {
  static last: FakeAudio | null = null;
  preload = "";
  src = "";
  private listeners = new Map<string, () => void>();
  constructor() {
    FakeAudio.last = this;
  }
  addEventListener(name: string, fn: () => void) {
    this.listeners.set(name, fn);
  }
  removeAttribute() {}
  load() {}
  fire(name: string) {
    this.listeners.get(name)?.();
  }
}

describe("canLoadAudio", () => {
  it("メタデータを読み込めたら true", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const result = canLoadAudio("https://example.com/a.mp3");
    FakeAudio.last?.fire("loadedmetadata");
    await expect(result).resolves.toBe(true);
    expect(FakeAudio.last?.src).toBe("https://example.com/a.mp3");
  });

  it("読み込みに失敗したら false(置いていない音声など)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const result = canLoadAudio("https://example.com/missing.mp3");
    FakeAudio.last?.fire("error");
    await expect(result).resolves.toBe(false);
  });

  it("時間内に読み込めなければ false(通信が遅い・つながらないとき)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Audio", FakeAudio);
    const result = canLoadAudio("https://example.com/slow.mp3", 5000);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toBe(false);
  });
});
