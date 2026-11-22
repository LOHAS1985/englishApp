// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import HeaderMenu from "./HeaderMenu";

beforeEach(() => {
  localStorage.clear();
});
afterEach(cleanup);

const renderMenu = () =>
  render(
    <MemoryRouter>
      <HeaderMenu />
    </MemoryRouter>,
  );

describe("ヘッダーのメニュー", () => {
  it("初めは閉じていて、押すと学習記録と表示の設定が出る", async () => {
    const user = userEvent.setup();
    renderMenu();
    expect(screen.queryByRole("link", { name: "学習記録" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "メニュー" }));
    expect(screen.getByRole("link", { name: "学習記録" }).getAttribute("href")).toBe("/mypage");
    expect(screen.getByRole("group", { name: "配色" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "文字の大きさ" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "メニュー" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("Esc で閉じる", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "メニュー" }));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "学習記録" })).toBeNull();
  });

  it("外を押すと閉じる", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "メニュー" }));

    await user.click(document.body);
    expect(screen.queryByRole("link", { name: "学習記録" })).toBeNull();
  });

  it("学習記録を選ぶと閉じる", async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole("button", { name: "メニュー" }));

    await user.click(screen.getByRole("link", { name: "学習記録" }));
    expect(screen.queryByRole("group", { name: "配色" })).toBeNull();
  });
});
