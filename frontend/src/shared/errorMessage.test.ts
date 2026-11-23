import { describe, expect, it } from "vitest";
import { messageOf } from "./errorMessage";

describe("messageOf", () => {
  it("Error の文言を使い、それ以外は既定の文言にする", () => {
    expect(messageOf(new Error("サーバーに接続できません"), "失敗しました")).toBe("サーバーに接続できません");
    expect(messageOf("x", "失敗しました")).toBe("失敗しました");
    expect(messageOf(new Error(""), "失敗しました")).toBe("失敗しました");
  });
});
