// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadProgress, parseProgress, recordQuiz, setRead, toggleBookmark } from "./bookProgress";

beforeEach(() => localStorage.clear());

describe("parseProgress", () => {
  it("保存が無い・壊れているときは空にする", () => {
    expect(parseProgress(null)).toEqual({});
    expect(parseProgress("not json")).toEqual({});
    expect(parseProgress("[1,2]")).toEqual({});
    expect(parseProgress('{"relative": 3}')).toEqual({});
  });

  it("しおりは、ページ番号とページ数が数なら読み戻す。壊れていれば捨てる", () => {
    const value = parseProgress(JSON.stringify({ a: { bookmark: { page: 3, total: 9 } }, b: { bookmark: { page: "x" } } }));
    expect(value.a?.bookmark).toEqual({ page: 3, total: 9 });
    expect(value.b?.bookmark).toBeUndefined();
  });
});

describe("読了と確認問題の記録", () => {
  it("読了にして、外すこともできる", () => {
    setRead("relative", true);
    expect(loadProgress().relative?.read).toBe(true);
    setRead("relative", false);
    expect(loadProgress().relative?.read).toBeUndefined();
  });

  it("確認問題は、正解の割合が高いときだけ最高得点を更新する", () => {
    recordQuiz("tense", 6, 10);
    recordQuiz("tense", 4, 10);
    expect(loadProgress().tense).toMatchObject({ quizBest: 6, quizTotal: 10 });
    recordQuiz("tense", 9, 10);
    expect(loadProgress().tense).toMatchObject({ quizBest: 9, quizTotal: 10 });
  });

  it("読了・しおり・確認問題の記録は、お互いを消さない", () => {
    setRead("noun", true);
    toggleBookmark("noun", 4, 12);
    recordQuiz("noun", 8, 10);
    expect(loadProgress().noun).toMatchObject({
      read: true,
      bookmark: { page: 4, total: 12 },
      quizBest: 8,
      quizTotal: 10,
    });
  });
});

describe("しおり", () => {
  it("挟むと、そのページとページ数を保存する", () => {
    toggleBookmark("relative", 3, 12);
    expect(loadProgress().relative?.bookmark).toEqual({ page: 3, total: 12 });
  });

  it("同じページでもう一度押すと外れる", () => {
    toggleBookmark("relative", 3, 12);
    toggleBookmark("relative", 3, 12);
    expect(loadProgress().relative?.bookmark).toBeUndefined();
  });

  it("別のページで押すと、しおりは移る", () => {
    toggleBookmark("relative", 3, 12);
    toggleBookmark("relative", 7, 12);
    expect(loadProgress().relative?.bookmark).toEqual({ page: 7, total: 12 });
  });
});
