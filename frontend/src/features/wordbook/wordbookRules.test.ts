import { describe, expect, it } from "vitest";
import type { WordbookWord } from "../../api/client";
import {
  dueLabel,
  matchesFilter,
  matchesLevel,
  matchesQuery,
  sentenceAround,
  sortWords,
  todayJst,
  toHeadword,
} from "./wordbookRules";

describe("toHeadword", () => {
  it("前後の記号と空白を外して英単語にする", () => {
    expect(toHeadword(" abandon, ")).toBe("abandon");
    expect(toHeadword("(well-known)")).toBe("well-known");
    expect(toHeadword("don't")).toBe("don't");
  });

  it("英単語1語でなければ null", () => {
    expect(toHeadword("take off")).toBeNull();
    expect(toHeadword("1,000")).toBeNull();
    expect(toHeadword("   ")).toBeNull();
    expect(toHeadword("日本語")).toBeNull();
  });
});

describe("sentenceAround", () => {
  const text = "The plan was simple. The team had to abandon it quickly! Why? Nobody knew.";

  it("選んだ語を含む文だけを返す", () => {
    const start = text.indexOf("abandon");
    expect(sentenceAround(text, start, start + "abandon".length)).toBe(
      "The team had to abandon it quickly!",
    );
  });

  it("文頭の語は本文の先頭から文末まで", () => {
    expect(sentenceAround(text, 0, 3)).toBe("The plan was simple.");
  });

  it("文末の語は最後の文の終わりまで", () => {
    const start = text.indexOf("Nobody");
    expect(sentenceAround(text, start, start + "Nobody".length)).toBe("Nobody knew.");
  });

  it("段落の区切り(改行)で切る", () => {
    const body = "First paragraph ends here.\nThe second paragraph has the target word inside.";
    const start = body.indexOf("target");
    expect(sentenceAround(body, start, start + "target".length)).toBe(
      "The second paragraph has the target word inside.",
    );
  });
});

const word = (overrides: Partial<WordbookWord> & { word: string }): WordbookWord => ({
  id: 1,
  meaningJa: "訳",
  exampleEn: null,
  exampleAnswer: null,
  exampleJa: null,
  source: "BUNDLED",
  color: "NONE",
  translationStatus: "DONE",
  createdAt: "2026-11-01T00:00:00",
  timesAsked: 0,
  timesCorrect: 0,
  nextDueDate: null,
  ...overrides,
});

describe("一覧の絞り込み", () => {
  const today = "2026-11-22";
  const fresh = word({ word: "fresh" });
  const due = word({ word: "due", timesAsked: 2, timesCorrect: 1, nextDueDate: "2026-11-22", color: "RED" });
  const overdue = word({ word: "overdue", timesAsked: 1, nextDueDate: "2026-11-20" });
  const later = word({ word: "later", timesAsked: 3, timesCorrect: 3, nextDueDate: "2026-12-01", color: "BLUE" });
  const all = [fresh, due, overdue, later];

  it("今日の復習は、復習日が今日以前の語", () => {
    expect(all.filter((w) => matchesFilter(w, "DUE", today)).map((w) => w.word)).toEqual(["due", "overdue"]);
  });

  it("未学習は、一度も出していない語", () => {
    expect(all.filter((w) => matchesFilter(w, "UNSEEN", today)).map((w) => w.word)).toEqual(["fresh"]);
  });

  it("色で絞り込む。すべては絞らない", () => {
    expect(all.filter((w) => matchesFilter(w, "RED", today)).map((w) => w.word)).toEqual(["due"]);
    expect(all.filter((w) => matchesFilter(w, "ALL", today))).toHaveLength(4);
  });
});

describe("一覧の検索", () => {
  const w = word({
    word: "abandon",
    meaningJa: "を捨てる",
    exampleEn: "They had to Abandon the plan.",
    exampleJa: "彼らは計画を断念した。",
  });

  it("語・訳・例文(英語・日本語)のどれでも見つかる。大文字小文字は問わない", () => {
    expect(matchesQuery(w, "ABAN")).toBe(true);
    expect(matchesQuery(w, "捨てる")).toBe(true);
    expect(matchesQuery(w, "the plan")).toBe(true);
    expect(matchesQuery(w, "断念")).toBe(true);
    expect(matchesQuery(w, "zzz")).toBe(false);
    expect(matchesQuery(w, "  ")).toBe(true);
  });
});

describe("一覧の並べ替え", () => {
  const a = word({ word: "banana", color: "BLUE", timesAsked: 4, timesCorrect: 4, nextDueDate: "2026-12-01" });
  const b = word({ word: "apple", color: "RED", timesAsked: 4, timesCorrect: 1, nextDueDate: "2026-11-23" });
  const c = word({ word: "cherry", color: "NONE" });
  const d = word({ word: "date", color: "YELLOW", timesAsked: 2, timesCorrect: 1, nextDueDate: "2026-11-22" });
  const list = [a, b, c, d];

  it("ABC順", () => {
    expect(sortWords(list, "ALPHABET").map((w) => w.word)).toEqual(["apple", "banana", "cherry", "date"]);
  });

  it("色順は赤→黄→無色→青", () => {
    expect(sortWords(list, "COLOR").map((w) => w.color)).toEqual(["RED", "YELLOW", "NONE", "BLUE"]);
  });

  it("正答率が低い順。まだ出していない語は最後", () => {
    expect(sortWords(list, "ACCURACY").map((w) => w.word)).toEqual(["apple", "date", "banana", "cherry"]);
  });

  it("復習日が近い順。復習日のない語は最後", () => {
    expect(sortWords(list, "DUE").map((w) => w.word)).toEqual(["date", "apple", "banana", "cherry"]);
  });

  it("登録順は元の並びのまま。元の配列は変えない", () => {
    expect(sortWords(list, "ADDED")).toEqual(list);
    sortWords(list, "ALPHABET");
    expect(list.map((w) => w.word)).toEqual(["banana", "apple", "cherry", "date"]);
  });
});

describe("日付", () => {
  it("今日の日付は日本時間で出す", () => {
    // 2026-11-21 16:00 UTC は日本時間では 11-22 01:00
    expect(todayJst(new Date("2026-11-21T16:00:00Z"))).toBe("2026-11-22");
    expect(todayJst(new Date("2026-11-21T14:59:00Z"))).toBe("2026-11-21");
  });

  it("復習日の表示", () => {
    expect(dueLabel(null, "2026-11-22")).toBeNull();
    expect(dueLabel("2026-11-20", "2026-11-22")).toBe("今日");
    expect(dueLabel("2026-11-22", "2026-11-22")).toBe("今日");
    expect(dueLabel("2026-11-23", "2026-11-22")).toBe("明日");
    expect(dueLabel("2026-12-05", "2026-11-22")).toBe("12/5");
    // 月をまたぐ「明日」
    expect(dueLabel("2026-12-01", "2026-11-30")).toBe("明日");
  });
});

describe("水準の絞り込み", () => {
  const easy = word({ word: "agenda", level: 1 });
  const hard = word({ word: "cajole", level: 4 });
  const mine = word({ word: "mine", source: "MANUAL", level: null });

  it("選んだ水準の語だけ。登録した語(水準なし)はすべてのときだけ出す", () => {
    expect([easy, hard, mine].filter((w) => matchesLevel(w, 4)).map((w) => w.word)).toEqual(["cajole"]);
    expect([easy, hard, mine].filter((w) => matchesLevel(w, "ALL"))).toHaveLength(3);
  });
});
