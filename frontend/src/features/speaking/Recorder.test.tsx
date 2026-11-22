// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Recorder from "./Recorder";

let recorders: FakeRecorder[] = [];

class FakeRecorder {
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() {
    recorders.push(this);
  }
  start() {}
  stop() {
    this.onstop?.();
  }
}

const stream = { getTracks: () => [{ stop: vi.fn() }] };
let resolveMic: (() => void) | null = null;
const getUserMedia = vi.fn(
  () =>
    new Promise<typeof stream>((resolve) => {
      resolveMic = () => resolve(stream);
    }),
);

beforeEach(() => {
  recorders = [];
  getUserMedia.mockClear();
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
  let n = 0;
  URL.createObjectURL = vi.fn(() => `blob:fake-${++n}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("録音機", () => {
  it("マイクの許可を待っている間に連打しても、録音機は1つだけ作る", async () => {
    render(<Recorder maxSeconds={60} />);
    const button = screen.getByRole("button", { name: /録音開始/ });

    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);
    await act(async () => resolveMic?.());

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(recorders).toHaveLength(1);
  });

  it("録り直すと、前の録音の URL を解放する", async () => {
    render(<Recorder maxSeconds={60} />);

    await userEvent.click(screen.getByRole("button", { name: /録音開始/ }));
    await act(async () => resolveMic?.());
    await userEvent.click(await screen.findByRole("button", { name: /録音停止/ }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    await userEvent.click(await screen.findByRole("button", { name: /録り直す/ }));
    await act(async () => resolveMic?.());

    // 録り直しを始めた時点で、前の録音の URL を解放する
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-1");
  });
});
