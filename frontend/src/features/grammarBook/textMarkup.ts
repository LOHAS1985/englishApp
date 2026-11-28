/**
 * 教科書の文章(説明・例文・まとめ)の記法。**語** は太字、空行は段落の区切り、行頭の「・」は箇条書き。
 * HTML は使わず、画面(RichText)がこの結果から要素を組み立てる。
 */

export interface TextPart {
  text: string;
  bold: boolean;
}

/** **太字** で区切る。** の数が合わないときは、残りを太字にせずそのまま出す */
export function splitBold(text: string): TextPart[] {
  const pieces = text.split("**");
  if (pieces.length % 2 === 0) return [{ text: text.replace(/\*\*/g, ""), bold: false }];
  return pieces.map((t, i) => ({ text: t, bold: i % 2 === 1 })).filter((p) => p.text !== "");
}

export type Block = { kind: "paragraph"; lines: string[] } | { kind: "list"; items: string[] };

/** 空行で段落に分ける。すべての行が「・」で始まる段落は箇条書きにする */
export function toBlocks(text: string): Block[] {
  return text
    .split(/\n{2,}/)
    .map((chunk) => chunk.split("\n").filter((l) => l.trim() !== ""))
    .filter((lines) => lines.length > 0)
    .map((lines): Block =>
      lines.every((l) => l.trimStart().startsWith("・"))
        ? { kind: "list", items: lines.map((l) => l.trimStart().slice(1).trim()) }
        : { kind: "paragraph", lines },
    );
}
