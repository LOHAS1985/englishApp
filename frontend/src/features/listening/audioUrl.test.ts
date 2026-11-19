import { afterEach, describe, expect, it, vi } from "vitest";
import { preloadAudio, pregeneratedAudioUrl } from "./audioUrl";

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
  removeEventListener(name: string) {
    this.listeners.delete(name);
  }
  removeAttribute() {}
  load() {}
  fire(name: string) {
    this.listeners.get(name)?.();
  }
}

describe("preloadAudio", () => {
  it("メタデータを読み込めたら、読み込み中の要素を返す(再生にそのまま使う)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const result = preloadAudio("https://example.com/a.mp3");
    const audio = FakeAudio.last;
    audio?.fire("loadedmetadata");
    await expect(result).resolves.toBe(audio);
    expect(audio?.src).toBe("https://example.com/a.mp3");
    // 最後まで読み込んでおく
    expect(audio?.preload).toBe("auto");
  });

  it("読み込みに失敗したら null(置いていない音声など)", async () => {
    vi.stubGlobal("Audio", FakeAudio);
    const result = preloadAudio("https://example.com/missing.mp3");
    FakeAudio.last?.fire("error");
    await expect(result).resolves.toBeNull();
  });

  it("時間内に読み込めなければ null(通信が遅い・つながらないとき)", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("Audio", FakeAudio);
    const result = preloadAudio("https://example.com/slow.mp3", 5000);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toBeNull();
  });
});
