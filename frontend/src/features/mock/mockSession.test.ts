import { describe, expect, it } from "vitest";
import { MOCK_SESSION_MAX_AGE_MS, parseMockSession } from "./mockSession";

const NOW = 1_700_000_000_000;

const valid = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: 1,
    savedAt: NOW - 60_000,
    phase: "reading",
    exam: { sections: [] },
    answers: { "grammar:g0001": ["A"] },
    listeningIndex: 3,
    sectionStart: NOW - 120_000,
    listeningSeconds: 2400,
    ...overrides,
  });

describe("parseMockSession", () => {
  it("保存した途中経過を読み戻す", () => {
    const session = parseMockSession(valid(), NOW);
    expect(session?.phase).toBe("reading");
    expect(session?.answers["grammar:g0001"]).toEqual(["A"]);
    expect(session?.listeningSeconds).toBe(2400);
  });

  it("保存が無い・壊れている・形が違うときは null", () => {
    expect(parseMockSession(null, NOW)).toBeNull();
    expect(parseMockSession("not json", NOW)).toBeNull();
    expect(parseMockSession("7", NOW)).toBeNull();
    expect(parseMockSession(valid({ version: 2 }), NOW)).toBeNull();
    expect(parseMockSession(valid({ phase: "result" }), NOW)).toBeNull();
    expect(parseMockSession(valid({ exam: null }), NOW)).toBeNull();
    expect(parseMockSession(valid({ exam: { sections: "x" } }), NOW)).toBeNull();
    expect(parseMockSession(valid({ answers: null }), NOW)).toBeNull();
    expect(parseMockSession(valid({ sectionStart: "now" }), NOW)).toBeNull();
  });

  it("期限を過ぎた途中経過は捨てる", () => {
    expect(parseMockSession(valid({ savedAt: NOW - MOCK_SESSION_MAX_AGE_MS }), NOW)).not.toBeNull();
    expect(parseMockSession(valid({ savedAt: NOW - MOCK_SESSION_MAX_AGE_MS - 1 }), NOW)).toBeNull();
  });
});
