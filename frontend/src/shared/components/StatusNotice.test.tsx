// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.stubEnv("VITE_API_BASE_URL", "https://api.test");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const entry = (id: string) => ({
  id,
  feature: "grammar",
  path: "/api/grammar/answer",
  body: { questionId: "g1", clientRequestId: id, answeredAt: "2026-11-22T00:00:00.000Z" },
  rows: [],
  createdAt: Date.now(),
});

describe("画面下の通知", () => {
  it("何も無いときは出さない", async () => {
    const { default: StatusNotice } = await import("./StatusNotice");
    const { container } = render(<StatusNotice />);
    expect(container.textContent).toBe("");
  });

  it("まだ送れていない解答記録の件数を出し、送れたら消える", async () => {
    localStorage.setItem("englishApp.outbox", JSON.stringify([entry("1-a"), entry("2-b")]));
    const { default: StatusNotice } = await import("./StatusNotice");
    render(<StatusNotice />);
    expect(screen.getByRole("status").textContent).toContain("未送信の解答記録が 2 件");

    // 別のタブが送って、保存が空になった
    await act(async () => {
      localStorage.setItem("englishApp.outbox", "[]");
      window.dispatchEvent(new StorageEvent("storage", { key: "englishApp.outbox" }));
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("サーバーの応答が遅いときは、起動中であることを知らせる", async () => {
    vi.useFakeTimers();
    try {
      let respond!: (r: Response) => void;
      vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => (respond = resolve))));
      const { send, WAKING_NOTICE_MS } = await import("../../api/http");
      const { default: StatusNotice } = await import("./StatusNotice");
      render(<StatusNotice />);

      const request = send("/api/level", "失敗");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(WAKING_NOTICE_MS + 1);
      });
      expect(screen.getByRole("status").textContent).toContain("サーバーを起動しています");

      await act(async () => {
        respond(new Response("{}", { status: 200 }));
        await request;
      });
      expect(screen.queryByRole("status")).toBeNull();
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });
});
