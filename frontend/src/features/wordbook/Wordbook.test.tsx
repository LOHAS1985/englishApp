// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWordbookHistory, fetchWordbookSummary } from "../../api/client";
import Wordbook from "./Wordbook";

vi.mock("../../shared/components/Header", () => ({ default: () => null }));
vi.mock("../../api/client", () => ({ fetchWordbookSummary: vi.fn(), fetchWordbookHistory: vi.fn() }));

afterEach(cleanup);

describe("単語帳のメニュー", () => {
  it("今日復習する語の数と、まだ出していない語の数を出す", async () => {
    vi.mocked(fetchWordbookSummary).mockResolvedValue({
      total: 500,
      none: 480,
      blue: 5,
      yellow: 5,
      red: 10,
      pendingTranslation: 0,
      due: 12,
      unseen: 431,
    });
    vi.mocked(fetchWordbookHistory).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Wordbook />
      </MemoryRouter>,
    );

    expect(await screen.findByText("12")).toBeTruthy();
    expect(screen.getByText("431")).toBeTruthy();
    expect(screen.getByText(/今日の復習/)).toBeTruthy();
  });
});
