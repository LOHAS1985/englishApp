import { describe, expect, it } from "vitest";
import { pickWordVoice } from "./pronounce";

describe("pickWordVoice(単語の読み上げの声)", () => {
  it("米国英語の声を優先する", () => {
    const voices = [
      { name: "Kyoko", lang: "ja-JP" },
      { name: "Daniel", lang: "en-GB" },
      { name: "Samantha", lang: "en_US" },
    ];
    expect(pickWordVoice(voices)?.name).toBe("Samantha");
  });

  it("米国英語が無ければ、他の英語の声を使う", () => {
    expect(pickWordVoice([{ name: "Kyoko", lang: "ja-JP" }, { name: "Daniel", lang: "en-GB" }])?.name).toBe("Daniel");
  });

  it("英語の声が無ければ null(既定の声に en-US を指定する)", () => {
    expect(pickWordVoice([{ name: "Kyoko", lang: "ja-JP" }])).toBeNull();
  });
});
