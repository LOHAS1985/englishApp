import { describe, expect, it } from "vitest";
import { pushRecent, RECENT_LIMIT, sentenceAround, toHeadword } from "./wordbookRules";

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

describe("pushRecent", () => {
  it("新しい語を先頭にし、同じ語は1つにまとめる", () => {
    expect(pushRecent([1, 2, 3], 2)).toEqual([2, 1, 3]);
  });

  it("直近の件数までに切り詰める", () => {
    let recent: number[] = [];
    for (let id = 1; id <= 10; id++) recent = pushRecent(recent, id);
    expect(recent).toHaveLength(RECENT_LIMIT);
    expect(recent[0]).toBe(10);
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
