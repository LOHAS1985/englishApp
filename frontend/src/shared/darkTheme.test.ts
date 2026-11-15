/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Vitest は CSS の読み込みを空にするので(?raw でも空)、CSS だけは fs で直接読む
const indexCss = readFileSync(new URL("../index.css", import.meta.url), "utf-8");

/**
 * ダークモードは、使っている色のクラスを index.css で個別に置き換える仕組み(置き換えの無い色はライトのまま残る)。
 * 新しい色のクラスを足して置き換えを忘れると、暗い背景に暗い文字(または明るい背景に明るい文字)が出るので、
 * 置き換えの無い色のクラスが増えたらこのテストで気づけるようにする。
 */
const sources = import.meta.glob(["../**/*.tsx", "!../**/*.test.tsx"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const COLOR_CLASS =
  /^(?:(?:hover|focus|disabled|group-hover|active|focus-visible):)*(?:text|bg|border|from|to|via|ring|divide|placeholder|fill|stroke)-(?:\[#[0-9a-fA-F]{3,8}\](?:\/\d+)?|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d+)?|white(?:\/\d+)?|black(?:\/\d+)?)$/;

/** index.css のダークモードの部分で、置き換えている(セレクタに出てくる)クラス名 */
function coveredClasses(): Set<string> {
  const dark = indexCss.slice(indexCss.indexOf('html[data-theme="dark"]'));
  const covered = new Set<string>();
  for (const m of dark.matchAll(/\.((?:\\.|[A-Za-z0-9_-])+)/g)) {
    covered.add((m[1] ?? "").replace(/\\(.)/g, "$1"));
  }
  return covered;
}

/** ソースに出てくる色のクラス名 */
function usedColorClasses(): Set<string> {
  const used = new Set<string>();
  for (const src of Object.values(sources)) {
    for (const m of src.matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
      for (const c of (m[1] ?? "").split(/\s+/)) {
        if (COLOR_CLASS.test(c)) used.add(c);
      }
    }
  }
  return used;
}

/**
 * 置き換えが無くても、ダークで読める(または問題ない)と確認した色。
 * 新しい色を足すときは、まずダークで読めるかを確かめ、置き換えが要るなら index.css に足す。
 * 置き換えが要らないと確認できたものだけ、ここに足す。
 */
const CHECKED_WITHOUT_OVERRIDE = new Set([
  // 色付きのボタン・バッジ・棒グラフ(白い文字を乗せるものはコントラストを測って確認済み)
  "bg-[#2463a8]",
  "bg-[#c0392b]",
  "bg-[#e6b800]",
  "bg-[#f59e0b]",
  "bg-[#5b9a3c]",
  "hover:bg-[#1d5289]",
  "hover:bg-[#7a9843]",
  "hover:bg-[#d97706]",
  // 暗い色のヘッダー・ダイアログ(元から暗い背景に、明るい文字を乗せている)
  "bg-slate-700",
  "hover:bg-slate-600",
  "border-slate-600",
  "ring-slate-700",
  "bg-black/50",
  "bg-white/20",
  "hover:bg-white/10",
  "text-slate-200",
  "text-white/80",
  "hover:text-white/90",
  // 明るい緑のボタンに乗せる濃紺の文字(明るい背景なのでそのまま読める)
  "text-[#0f1724]",
  // 無効なボタンの背景(白い文字を乗せる。灰色のまま)
  "disabled:bg-slate-400",
  // 枠線・薄い色の補助(文字ではないので、ダークでも見分けられる)
  "border-[#16233d]",
  "hover:border-[#16233d]",
  "border-[#2463a8]",
  "bg-[#2463a8]/5",
  "border-[#6a8a3e]",
  "border-[#8fae4e]",
  "hover:border-[#8fae4e]",
  "hover:border-[#c0392b]",
  "border-[#e6b800]",
  // 明るい灰色の文字(ライトでは目立たせない補足。ダークでは暗い背景に明るく乗って読める)
  "text-slate-300",
  // 「済 ✓」の緑の文字(ダークの背景に対して比 4.5 以上)
  "text-[#5b9a3c]",
]);

describe("ダークモードの色の置き換え", () => {
  it("置き換えの無い色のクラスは、確認済みのものだけ", () => {
    const covered = coveredClasses();
    const missing = [...usedColorClasses()].filter((c) => !covered.has(c) && !CHECKED_WITHOUT_OVERRIDE.has(c)).sort();
    expect(
      missing,
      "ダークモードの置き換えが無い色のクラスがあります。ダークで読めるかを確かめ、必要なら index.css に置き換えを足すか、" +
        "問題が無いと確認できたら darkTheme.test.ts の CHECKED_WITHOUT_OVERRIDE に足してください",
    ).toEqual([]);
  });

  it("このテストが画面のソースと CSS を読めている(空振りしていない)", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10);
    expect(coveredClasses().size).toBeGreaterThan(20);
    expect(usedColorClasses().size).toBeGreaterThan(30);
  });

  it("試験の見出しカードのグラデーションは、ダークで暗い色に置き換えている", () => {
    // 見出しの文字をダークで明るくしているので、背景が明るいままだと読めなくなる
    for (const c of ["from-[#a1c4fd]", "to-[#c2e9fb]", "from-[#f6d365]", "to-[#fda085]"]) {
      expect(coveredClasses().has(c), c).toBe(true);
    }
  });
});
