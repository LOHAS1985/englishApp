import { beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeListeningAudio } from "../../api/client";
import { preloadAudio } from "./audioUrl";
import { prepareAudio, takePreparedAudio, warmUpListeningAudio } from "./audioPrepare";

vi.mock("../../api/client", () => ({
  synthesizeListeningAudio: vi.fn(),
  toAbsoluteApiUrl: (path: string) => `https://api.example.com${path}`,
}));
vi.mock("./audioUrl", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./audioUrl")>()),
  preloadAudio: vi.fn(),
}));

/** 読み込み済みの音声要素の代わり(中身は見ないので、区別できれば何でもよい) */
const element = (name: string) => ({ name }) as unknown as HTMLAudioElement;

beforeEach(() => {
  vi.mocked(preloadAudio).mockReset();
  vi.mocked(synthesizeListeningAudio).mockReset();
});

describe("prepareAudio(音声の準備)", () => {
  it("置いてある音声を読み込めたら、それを使う(サーバーでは作らない)", async () => {
    const audio = element("release");
    vi.mocked(preloadAudio).mockResolvedValue(audio);

    const prepared = await prepareAudio("l0467");

    expect(prepared).toEqual({
      kind: "audio",
      urls: ["https://github.com/LOHAS1985/englishApp/releases/download/audio-1/l0467.mp3"],
      first: audio,
    });
    expect(synthesizeListeningAudio).not.toHaveBeenCalled();
  });

  it("置いていなければサーバーで作り、その先頭も読み込んでおく", async () => {
    const audio = element("server");
    vi.mocked(preloadAudio).mockResolvedValueOnce(null).mockResolvedValueOnce(audio);
    vi.mocked(synthesizeListeningAudio).mockResolvedValue({ audioUrls: ["/audio/a.mp3", "/audio/b.mp3"] });

    const prepared = await prepareAudio("l1100");

    expect(prepared).toEqual({
      kind: "audio",
      urls: ["https://api.example.com/audio/a.mp3", "https://api.example.com/audio/b.mp3"],
      first: audio,
    });
    expect(vi.mocked(preloadAudio).mock.calls[1]?.[0]).toBe("https://api.example.com/audio/a.mp3");
  });

  it("サーバーでも作れなければ、ブラウザの読み上げにする", async () => {
    vi.mocked(preloadAudio).mockResolvedValue(null);
    vi.mocked(synthesizeListeningAudio).mockRejectedValue(new Error("音声の生成に失敗しました"));

    await expect(prepareAudio("l1100")).resolves.toEqual({ kind: "browser" });
  });
});

describe("warmUpListeningAudio(次のセットの音声の先読み)", () => {
  it("先に始めた準備を、表示したときにそのまま使う(読み込み直さない)", async () => {
    vi.mocked(preloadAudio).mockResolvedValue(element("release"));

    warmUpListeningAudio("l0100");
    warmUpListeningAudio("l0100"); // 同じセットは2回準備しない
    const prepared = await takePreparedAudio("l0100");

    expect(prepared.kind).toBe("audio");
    expect(preloadAudio).toHaveBeenCalledTimes(1);
  });

  it("使った準備は消すので、もう一度表示したときは準備し直す", async () => {
    vi.mocked(preloadAudio).mockResolvedValue(element("release"));

    warmUpListeningAudio("l0200");
    await takePreparedAudio("l0200");
    await takePreparedAudio("l0200");

    expect(preloadAudio).toHaveBeenCalledTimes(2);
  });
});
