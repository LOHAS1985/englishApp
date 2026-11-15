import { describe, expect, it } from "vitest";
import { choiceIndexFromKey } from "./quizKeys";

describe("choiceIndexFromKey", () => {
  it("数字と英字のどちらでも同じ選択肢を指す", () => {
    expect(choiceIndexFromKey("1", 4)).toBe(0);
    expect(choiceIndexFromKey("a", 4)).toBe(0);
    expect(choiceIndexFromKey("A", 4)).toBe(0);
    expect(choiceIndexFromKey("4", 4)).toBe(3);
    expect(choiceIndexFromKey("d", 4)).toBe(3);
  });

  it("選択肢の数を超えるキー・選択肢でないキーは無視する", () => {
    expect(choiceIndexFromKey("5", 4)).toBeNull();
    expect(choiceIndexFromKey("e", 4)).toBeNull();
    expect(choiceIndexFromKey("0", 4)).toBeNull();
    expect(choiceIndexFromKey("Enter", 4)).toBeNull();
    expect(choiceIndexFromKey(" ", 4)).toBeNull();
    expect(choiceIndexFromKey("ArrowDown", 4)).toBeNull();
  });

  it("3択(TOEIC Part 2)では C までが有効", () => {
    expect(choiceIndexFromKey("c", 3)).toBe(2);
    expect(choiceIndexFromKey("d", 3)).toBeNull();
  });
});
