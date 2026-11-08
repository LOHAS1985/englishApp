import { describe, expect, it } from "vitest";
import { attemptsFromRows, difficultyTarget, pick, type AnswerRow } from "./picker";

/** 呼ぶたびに決まった順の値を返す乱数(テストを決定的にする) */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

/** 0 以上 1 未満の乱数の代表値(端から端まで) */
const SAMPLES = Array.from({ length: 20 }, (_, i) => i / 20);

/** 候補の ID を q0, q1, ... で作る */
function ids(n: number) {
  return Array.from({ length: n }, (_, i) => `q${i}`);
}

const row = (itemId: string, correct: boolean | null, questionNo = 1): AnswerRow => ({
  itemId,
  questionNo,
  correct,
});

/** 同じ問題の解答を n 回分(正解 correct 回、残りは不正解)作る。新しい順に並べて返す */
function results(itemId: string, total: number, correct: number): AnswerRow[] {
  return Array.from({ length: total }, (_, i) => row(itemId, i < correct));
}

describe("pick", () => {
  it("一巡するまで同じ問題を出さない", () => {
    const candidates = ["a", "b", "c", "d", "e", "f"];
    const attempts: { itemId: string; correct: boolean | null }[] = [];
    const random = sequence(0.1, 0.6, 0.9, 0.2, 0.4, 0.8);
    const picked: string[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const id = pick(candidates, attempts, null, undefined, undefined, random);
      picked.push(id);
      attempts.unshift({ itemId: id, correct: true });
    }
    expect(new Set(picked).size).toBe(candidates.length);
  });

  it("直近に出した問題は続けて出さない", () => {
    const candidates = ids(10);
    const attempts = [
      { itemId: "q0", correct: true },
      { itemId: "q1", correct: true },
      { itemId: "q2", correct: true },
    ];
    for (const r of SAMPLES) {
      const id = pick(candidates, attempts, null, undefined, undefined, () => r);
      expect(["q0", "q1", "q2"]).not.toContain(id);
    }
  });

  it("表示中の問題(exclude)は出さない", () => {
    const candidates = ["a", "b", "c", "d", "e", "f"];
    for (const r of SAMPLES) {
      expect(pick(candidates, [], "a", undefined, undefined, () => r)).not.toBe("a");
    }
  });

  it("間違えた問題は約3割の確率で出し直す", () => {
    const candidates = ids(10);
    // 最後の解答が不正解の q5 は、直近3問(q2〜q4)に入っていないので見直し対象になる
    const attempts = [
      { itemId: "q2", correct: true },
      { itemId: "q3", correct: true },
      { itemId: "q4", correct: true },
      { itemId: "q5", correct: false },
    ];
    expect(pick(candidates, attempts, null, undefined, undefined, () => 0.29)).toBe("q5");
    expect(pick(candidates, attempts, null, undefined, undefined, () => 0.3)).not.toBe("q5");
  });

  it("後で正解した問題は見直し対象にしない", () => {
    const candidates = ids(10);
    // q5 は一度間違えたが、その後正解している(最後の解答は正解)
    const attempts = [
      { itemId: "q5", correct: true },
      { itemId: "q2", correct: true },
      { itemId: "q3", correct: true },
      { itemId: "q4", correct: true },
      { itemId: "q5", correct: false },
    ];
    const id = pick(candidates, attempts, null, undefined, undefined, () => 0.1);
    expect(id).not.toBe("q5");
  });

  it("難易度の目標に近い問題から選ぶ", () => {
    const difficulty: Record<string, number> = { a: 1, b: 2, c: 3, d: 3 };
    const candidates = Object.keys(difficulty);
    const byDifficulty = (id: string) => difficulty[id];
    for (const r of [0, 0.3, 0.7, 0.99]) {
      expect(["c", "d"]).toContain(pick(candidates, [], null, byDifficulty, 3, () => r));
      expect(pick(candidates, [], null, byDifficulty, 1, () => r)).toBe("a");
      expect(pick(candidates, [], null, byDifficulty, 2, () => r)).toBe("b");
    }
  });

  it("目標の難易度の問題が候補に無ければ、最も近い難易度から選ぶ", () => {
    const difficulty: Record<string, number> = { a: 1, b: 2, c: 1 };
    for (const r of [0, 0.5, 0.99]) {
      expect(pick(["a", "b", "c"], [], null, (id) => difficulty[id], 3, () => r)).toBe("b");
    }
  });

  it("候補が無ければ例外を投げる", () => {
    expect(() => pick([], [], null)).toThrow("問題が登録されていません");
  });
});

describe("attemptsFromRows", () => {
  it("セット問題は設問1で区切り、全問正解のときだけ正解とする", () => {
    // 新しい順。s1 は設問2が不正解なので不正解、g1 は1問で正解
    const rows: AnswerRow[] = [
      row("s1", true, 3),
      row("s1", false, 2),
      row("s1", true, 1),
      row("g1", true, 1),
    ];
    expect(attemptsFromRows(rows)).toEqual([
      { itemId: "s1", correct: false },
      { itemId: "g1", correct: true },
    ]);
  });

  it("同じセットを2回解いた場合は、回ごとに別の解答として数える", () => {
    const rows: AnswerRow[] = [
      row("s1", true, 2),
      row("s1", true, 1),
      row("s1", false, 2),
      row("s1", true, 1),
    ];
    expect(attemptsFromRows(rows)).toEqual([
      { itemId: "s1", correct: true },
      { itemId: "s1", correct: false },
    ]);
  });

  it("正誤のない解答は correct が null になる", () => {
    expect(attemptsFromRows([row("w1", null, 1)])).toEqual([{ itemId: "w1", correct: null }]);
  });
});

describe("difficultyTarget", () => {
  // a は標準(2)、b は発展(3)、d は難関(4)、e は最難関(5)
  const levels: Record<string, number> = { a: 2, b: 3, d: 4, e: 5, one: 1 };
  const level = (id: string) => levels[id] ?? 2;

  it("解答が8件未満なら null を返す", () => {
    expect(difficultyTarget(results("a", 7, 7), new Set(["a"]), level)).toBeNull();
  });

  it("解いている問題の難易度を基準に、正答率で1段ずつ上げ下げする", () => {
    const candidates = new Set(["a"]);
    // 85% 以上は1つ上(境界を含む)
    expect(difficultyTarget(results("a", 8, 8), candidates, level)).toBe(3);
    expect(difficultyTarget(results("a", 20, 17), candidates, level)).toBe(3);
    // 60% 以上 85% 未満は同じ(境界を含む)
    expect(difficultyTarget(results("a", 20, 16), candidates, level)).toBe(2);
    expect(difficultyTarget(results("a", 20, 12), candidates, level)).toBe(2);
    // 60% 未満は1つ下
    expect(difficultyTarget(results("a", 20, 11), candidates, level)).toBe(1);
  });

  it("正答率が高ければ難関・最難関まで上がり、1〜5 の範囲に収まる", () => {
    expect(difficultyTarget(results("b", 10, 10), new Set(["b"]), level)).toBe(4);
    expect(difficultyTarget(results("d", 10, 10), new Set(["d"]), level)).toBe(5);
    expect(difficultyTarget(results("e", 10, 10), new Set(["e"]), level)).toBe(5);
    expect(difficultyTarget(results("one", 10, 0), new Set(["one"]), level)).toBe(1);
  });

  it("基準は直近に解いた問題の平均の難易度(四捨五入)", () => {
    // 新しい順に 難関 6問・発展 4問 → 平均 3.6 → 4。全問正解なので 5
    const rows = [...results("d", 6, 6), ...results("b", 4, 4)];
    expect(difficultyTarget(rows, new Set(["b", "d"]), level)).toBe(5);
  });

  it("直近30設問だけで判断する", () => {
    // 新しい順。直近30設問は全部不正解、その前の30設問は全部正解
    const rows = [...results("a", 30, 0), ...results("a", 30, 30)];
    expect(difficultyTarget(rows, new Set(["a"]), level)).toBe(1);
  });

  it("候補外の問題と正誤のない設問は数えない", () => {
    const rows = [...results("a", 8, 8), ...results("other", 20, 0), ...results("a", 5, 0).map((r) => ({ ...r, correct: null }))];
    expect(difficultyTarget(rows, new Set(["a"]), level)).toBe(3);
  });
});
