import { describe, expect, it } from "vitest";
import { DRAFT_MAX_AGE_MS, parseDraft } from "./draft";

const NOW = 1_700_000_000_000;
const raw = (o: unknown) => JSON.stringify(o);

describe("parseDraft", () => {
  it("保存した下書きを読み戻す", () => {
    expect(parseDraft<string>(raw({ id: "w0001", value: "My opinion", savedAt: NOW - 1000 }), NOW)).toEqual({
      id: "w0001",
      value: "My opinion",
      savedAt: NOW - 1000,
    });
  });

  it("オブジェクトの下書きも読める", () => {
    const draft = parseDraft<Record<number, string>>(raw({ id: "s0001", value: { 1: "One day" }, savedAt: NOW }), NOW);
    expect(draft?.value[1]).toBe("One day");
  });

  it("保存が無い・壊れている・形が違うときは null", () => {
    expect(parseDraft(null, NOW)).toBeNull();
    expect(parseDraft("not json", NOW)).toBeNull();
    expect(parseDraft("42", NOW)).toBeNull();
    expect(parseDraft(raw({ value: "x", savedAt: NOW }), NOW)).toBeNull();
    expect(parseDraft(raw({ id: "", value: "x", savedAt: NOW }), NOW)).toBeNull();
    expect(parseDraft(raw({ id: "a", savedAt: NOW }), NOW)).toBeNull();
    expect(parseDraft(raw({ id: "a", value: "x", savedAt: "yesterday" }), NOW)).toBeNull();
  });

  it("期限を過ぎた下書きは捨てる", () => {
    expect(parseDraft(raw({ id: "a", value: "x", savedAt: NOW - DRAFT_MAX_AGE_MS }), NOW)).not.toBeNull();
    expect(parseDraft(raw({ id: "a", value: "x", savedAt: NOW - DRAFT_MAX_AGE_MS - 1 }), NOW)).toBeNull();
  });
});
