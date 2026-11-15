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
  it("A+ / A− で文字の大きさを変え、端末に保存する", async () => {
    const user = userEvent.setup();
    render(<DisplaySettingsControl />);

    await user.click(screen.getByRole("button", { name: "文字を大きくする" }));
    await user.click(screen.getByRole("button", { name: "文字を大きくする" }));
    expect(document.documentElement.style.fontSize).toBe("130%");
    expect(JSON.parse(localStorage.getItem("displaySettings") ?? "{}").fontScale).toBe(130);

    await user.click(screen.getByRole("button", { name: "文字を小さくする" }));
    expect(document.documentElement.style.fontSize).toBe("115%");
  });

  it("標準の大きさでは「小さくする」を押せない", () => {
    render(<DisplaySettingsControl />);
    expect((screen.getByRole("button", { name: "文字を小さくする" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("全幅の切り替えが html の data-wide に反映される", async () => {
    const user = userEvent.setup();
    render(<DisplaySettingsControl />);

    await user.click(screen.getByRole("button", { name: "全幅" }));
    expect(document.documentElement.hasAttribute("data-wide")).toBe(true);

    await user.click(screen.getByRole("button", { name: "全幅" }));
    expect(document.documentElement.hasAttribute("data-wide")).toBe(false);
  });

  it("配色は 端末に合わせる → ダーク → ライト の順に切り替わる(jsdom には matchMedia が無いのでライト扱い)", async () => {
    const user = userEvent.setup();
    render(<DisplaySettingsControl />);
    const themeButton = () => screen.getByRole("button", { name: /^配色:/ });

    expect(themeButton().getAttribute("aria-label")).toContain("端末に合わせる");
    await user.click(themeButton());
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    await user.click(themeButton());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    await user.click(themeButton());
    expect(document.documentElement.getAttribute("data-theme")).toBe("light"); // system → matchMedia 無し → light
    expect(JSON.parse(localStorage.getItem("displaySettings") ?? "{}").theme).toBe("system");
  });
});
