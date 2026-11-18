// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// 記録の送信待ち列には触らず、出題と採点だけを確かめる
vi.mock("./outbox", () => ({
  enqueueAnswer: vi.fn(),
  historyRows: () => [],
  refreshHistory: vi.fn(),
}));

import { enqueueAnswer } from "./outbox";
import { countSetTypes, gradeQuestionSet, pickQuestionSet } from "./localQuestions";

const READING_TYPES = ["toeic-part6", "toeic-part7", "eiken-cloze", "eiken-long"];
const LISTENING_TYPES = ["toeic-part2", "toeic-part3", "toeic-part4", "eiken-part1", "eiken-part2", "eiken-part3"];

describe("セット問題の形式別の問題集", () => {
  beforeEach(() => vi.mocked(enqueueAnswer).mockClear());

  it("形式を指定すると、その形式の問題だけが出る", async () => {
    for (const type of READING_TYPES) {
      expect((await pickQuestionSet("reading", type)).type).toBe(type);
    }
    for (const type of LISTENING_TYPES) {
      expect((await pickQuestionSet("listening", type)).type).toBe(type);
    }
  });

  it("登録のない形式は、分かるエラーにする", async () => {
    await expect(pickQuestionSet("reading", "no-such-type")).rejects.toThrow("まだ登録されていません");
  });

  it("形式ごとの問題数は index.json から数える(全形式のファイルを読まない)", async () => {
    const reading = await countSetTypes("reading");
    expect(Object.keys(reading).sort()).toEqual([...READING_TYPES].sort());
    expect(Object.values(reading).every((n) => n > 0)).toBe(true);
    const listening = await countSetTypes("listening");
    expect(Object.keys(listening).sort()).toEqual([...LISTENING_TYPES].sort());
  });

  it("出題していないセットでも、ID だけで採点できる(index.json で形式を引く)", async () => {
    // モジュールを読み込み直し、出題した形式の記憶が無い状態(画面を開き直した後など)にする
    vi.resetModules();
    const fresh = await import("./localQuestions");
    const index = (await import("../generated/questions/index.json")).default as Record<string, Record<string, string>>;
    const [id] = Object.entries(index.reading).find(([, type]) => type === "toeic-part6")!;
    const graded = await fresh.gradeQuestionSet("reading", id, ["A", "A", "A", "A"]);
    expect(graded.total).toBeGreaterThan(0);
  });

  it("存在しない ID は、再出題を促すエラーにする", async () => {
    await expect(gradeQuestionSet("reading", "no-such-id", ["A"])).rejects.toThrow("再度出題してください");
  });
});
