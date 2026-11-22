// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BuildVersion from "./BuildVersion";

const { fetchBackendCommit } = vi.hoisted(() => ({ fetchBackendCommit: vi.fn() }));
vi.mock("../../api/client", () => ({ fetchBackendCommit }));
// テストでは版を固定する(実際の値は git の HEAD で変わる)
vi.mock("../buildInfo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../buildInfo")>()),
  FRONTEND_COMMIT: "abc1234",
  FRONTEND_COMMIT_DATE: "2026-11-22T06:16:00+00:00",
}));

afterEach(() => {
  cleanup();
  fetchBackendCommit.mockReset();
});

describe("画面の版", () => {
  it("この画面の commit と日本時間の日時を出し、サーバーと同じなら違いは出さない", async () => {
    fetchBackendCommit.mockResolvedValue("abc1234def5678");
    render(<BuildVersion />);

    await waitFor(() => expect(screen.getByText(/サーバー abc1234/)).toBeTruthy());
    expect(screen.getByText("版 abc1234 ・ 2026/11/22 15:16 ・ サーバー abc1234")).toBeTruthy();
    expect(screen.queryByText(/版が違います/)).toBeNull();
  });

  it("サーバーの commit が違えば、版が違うと出す", async () => {
    fetchBackendCommit.mockResolvedValue("ffff000aaaa");
    render(<BuildVersion />);

    await waitFor(() => expect(screen.getByText(/版が違います/)).toBeTruthy());
  });

  it("サーバーの版が取れなければ、この画面の版だけ出す", async () => {
    fetchBackendCommit.mockResolvedValue(null);
    render(<BuildVersion />);

    await act(async () => {});
    expect(screen.queryByText(/サーバー/)).toBeNull();
    expect(screen.getByText(/版 abc1234/)).toBeTruthy();
  });
});
