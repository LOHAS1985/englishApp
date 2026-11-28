import { describe, expect, it } from "vitest";
import { splitBold, toBlocks } from "./textMarkup";

describe("splitBold", () => {
  it("** で囲んだ語を太字にする", () => {
    expect(splitBold("The **man** who came")).toEqual([
      { text: "The ", bold: false },
      { text: "man", bold: true },
      { text: " who came", bold: false },
    ]);
  });

  it("太字が無ければそのまま、先頭・末尾の太字も扱える", () => {
    expect(splitBold("plain")).toEqual([{ text: "plain", bold: false }]);
    expect(splitBold("**A** and **B**")).toEqual([
      { text: "A", bold: true },
      { text: " and ", bold: false },
      { text: "B", bold: true },
    ]);
  });

  it("記号の数が合わないときは、記号を消して太字にしない", () => {
    expect(splitBold("a **b")).toEqual([{ text: "a b", bold: false }]);
  });
});

describe("toBlocks", () => {
  it("空行で段落に分け、段落の中の改行は残す", () => {
    expect(toBlocks("一つ目\n続き\n\n二つ目")).toEqual([
      { kind: "paragraph", lines: ["一つ目", "続き"] },
      { kind: "paragraph", lines: ["二つ目"] },
    ]);
  });

  it("すべての行が「・」で始まる段落は箇条書きにする", () => {
    expect(toBlocks("次の2つです。\n\n・who\n・which")).toEqual([
      { kind: "paragraph", lines: ["次の2つです。"] },
      { kind: "list", items: ["who", "which"] },
    ]);
  });

  it("空の文章は何も出さない", () => {
    expect(toBlocks("")).toEqual([]);
    expect(toBlocks("\n\n")).toEqual([]);
  });
});
