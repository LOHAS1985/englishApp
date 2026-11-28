// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadProgress, parseProgress, recordQuiz, setRead } from "./bookProgress";

beforeEach(() => localStorage.clear());

describe("parseProgress", () => {
  it("保存が無い・壊れているときは空にする", () => {
    expect(parseProgress(null)).toEqual({});
    expect(parseProgress("not json")).toEqual({});
    expect(parseProgress("[1,2]")).toEqual({});
    expect(parseProgress('{"relative": 3}')).toEqual({});
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

  it("読了と確認問題の記録は、お互いを消さない", () => {
    setRead("noun", true);
    recordQuiz("noun", 8, 10);
    expect(loadProgress().noun).toMatchObject({ read: true, quizBest: 8, quizTotal: 10 });
  });
});
