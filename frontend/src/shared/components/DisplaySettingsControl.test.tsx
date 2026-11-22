// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import DisplaySettingsControl from "./DisplaySettingsControl";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-wide");
});
afterEach(cleanup);

describe("DisplaySettingsControl", () => {
  it("文字の大きさを選ぶと、端末に保存して反映する", async () => {
    const user = userEvent.setup();
    render(<DisplaySettingsControl />);

    await user.click(screen.getByRole("button", { name: "特大" }));
    expect(document.documentElement.style.fontSize).toBe("150%");
    expect(JSON.parse(localStorage.getItem("displaySettings") ?? "{}").fontScale).toBe(150);
    expect(screen.getByRole("button", { name: "特大" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "標準" }));
    expect(document.documentElement.style.fontSize).toBe("100%");
  });

  it("全幅の切り替えが html の data-wide に反映される", async () => {
    const user = userEvent.setup();
    render(<DisplaySettingsControl />);

    await user.click(screen.getByRole("button", { name: "問題を全幅に広げる" }));
    expect(document.documentElement.hasAttribute("data-wide")).toBe(true);

    await user.click(screen.getByRole("button", { name: "問題を全幅に広げる" }));
    expect(document.documentElement.hasAttribute("data-wide")).toBe(false);
  });

  it("配色は選んだものに切り替わる(jsdom には matchMedia が無いので、端末に合わせるはライト扱い)", async () => {
    const user = userEvent.setup();
    render(<DisplaySettingsControl />);

    await user.click(screen.getByRole("button", { name: "ダーク" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.click(screen.getByRole("button", { name: "ライト" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await user.click(screen.getByRole("button", { name: "端末に合わせる" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(JSON.parse(localStorage.getItem("displaySettings") ?? "{}").theme).toBe("system");
  });
});
