// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchListeningScript } from "../../api/client";
import { takePreparedAudio, type Prepared } from "./audioPrepare";
import ListeningPlayer from "./ListeningPlayer";

vi.mock("../../api/client", () => ({ fetchListeningScript: vi.fn() }));
vi.mock("./audioPrepare", () => ({ takePreparedAudio: vi.fn(), prepareAudio: vi.fn() }));

const prepared = (value: Prepared) => vi.mocked(takePreparedAudio).mockReturnValue(Promise.resolve(value));

beforeEach(() => {
  vi.mocked(fetchListeningScript).mockReset();
  vi.mocked(takePreparedAudio).mockReset();
  vi.stubGlobal("speechSynthesis", { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ListeningPlayer: 再生に失敗したとき", () => {
  it("ブラウザの読み上げ用の台本を取れなくても、「準備中」で固まらず、もう一度押せる", async () => {
    prepared({ kind: "browser" });
    vi.mocked(fetchListeningScript).mockRejectedValue(new Error("offline"));

    render(<ListeningPlayer setId="l1" />);
    await userEvent.click(screen.getByRole("button", { name: "▶ 音声を再生" }));

    expect(await screen.findByText("音声を再生できませんでした")).toBeTruthy();
    const button = screen.getByRole("button", { name: "▶ 音声を再生" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("模試のように聞き直せない設定でも、一度も再生できていなければ再生済みにしない", async () => {
    prepared({ kind: "browser" });
    vi.mocked(fetchListeningScript).mockRejectedValue(new Error("offline"));

    render(<ListeningPlayer setId="l1" allowReplay={false} />);
    await userEvent.click(screen.getByRole("button", { name: "▶ 音声を再生" }));

    await screen.findByText("音声を再生できませんでした");
    expect(screen.queryByText(/再生済み/)).toBeNull();
    expect((screen.getByRole("button", { name: "▶ 音声を再生" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("音声ファイルの再生が拒否されたときも、エラーを出して聞き直せる", async () => {
    prepared({ kind: "audio", urls: ["https://example.test/a.mp3"], first: null });
    class RejectingAudio {
      currentTime = 0;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      play() {
        return Promise.reject(new Error("NotAllowedError"));
      }
      pause() {}
    }
    vi.stubGlobal("Audio", RejectingAudio);

    render(<ListeningPlayer setId="l1" allowReplay={false} />);
    await userEvent.click(screen.getByRole("button", { name: "▶ 音声を再生" }));

    expect(await screen.findByText("音声を再生できませんでした")).toBeTruthy();
    expect(screen.queryByText(/再生済み/)).toBeNull();
  });
});
