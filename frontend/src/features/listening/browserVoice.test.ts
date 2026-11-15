import { describe, expect, it } from "vitest";
import { genderOfVoice, pickVoice, speakerVoiceSlot, type VoiceLike } from "./browserVoice";

const v = (name: string, lang = "en-US"): VoiceLike => ({ name, lang });

// Windows の Chrome に近い声の一覧。男性の声が先に並ぶ
const WINDOWS_VOICES = [
  v("Microsoft David - English (United States)"),
  v("Microsoft Mark - English (United States)"),
  v("Microsoft Zira - English (United States)"),
  v("Microsoft Hazel - English (Great Britain)", "en-GB"),
  v("Microsoft Haruka - Japanese (Japan)", "ja-JP"),
];

describe("genderOfVoice", () => {
  it("名前から性別を判断する", () => {
    expect(genderOfVoice(v("Microsoft Zira - English (United States)"))).toBe("female");
    expect(genderOfVoice(v("Microsoft David - English (United States)"))).toBe("male");
    expect(genderOfVoice(v("Samantha"))).toBe("female");
    expect(genderOfVoice(v("Alex"))).toBe("male");
  });

  it("female は male を含むが、女性として判断する", () => {
    expect(genderOfVoice(v("Google UK English Female", "en-GB"))).toBe("female");
    expect(genderOfVoice(v("Google UK English Male", "en-GB"))).toBe("male");
  });

  it("名前から分からない声は null", () => {
    expect(genderOfVoice(v("Voice 7"))).toBeNull();
  });
});

describe("speakerVoiceSlot", () => {
  it("Man は男性、Woman は女性", () => {
    expect(speakerVoiceSlot("Man").gender).toBe("male");
    expect(speakerVoiceSlot("Woman").gender).toBe("female");
    expect(speakerVoiceSlot("Woman 2").gender).toBe("female");
    expect(speakerVoiceSlot("Man 2").gender).toBe("male");
  });

  it("知らない話者名は、名前から性別を推測する", () => {
    expect(speakerVoiceSlot("Woman 3").gender).toBe("female");
    expect(speakerVoiceSlot("Customer").gender).toBe("male");
  });
});

describe("pickVoice", () => {
  it("男性の声が先に並んでいても、Woman には女性の声を選ぶ(Man と同じ男性の声にしない)", () => {
    expect(pickVoice("Woman", WINDOWS_VOICES)?.name).toContain("Zira");
    expect(pickVoice("Man", WINDOWS_VOICES)?.name).toContain("David");
    expect(pickVoice("Man", WINDOWS_VOICES)).not.toBe(pickVoice("Woman", WINDOWS_VOICES));
  });

  it("2人目の話者は、同じ性別の別の声を選ぶ", () => {
    expect(pickVoice("Man 2", WINDOWS_VOICES)?.name).toContain("David");
    // 男性の声が2つしかないので、Man(1番目)・Narrator(2番目)・Man 2(3番目)は回る
    expect(pickVoice("Narrator", WINDOWS_VOICES)?.name).toContain("Mark");
  });

  it("同じ性別の声が1つしかなければ、同じ声を使う(声を回す)", () => {
    const voices = [v("Microsoft David - English (United States)"), v("Microsoft Zira - English (United States)")];
    expect(pickVoice("Woman", voices)?.name).toContain("Zira");
    expect(pickVoice("Woman 2", voices)?.name).toContain("Zira");
  });

  it("米国英語の声を、ほかの地域の英語より先に選ぶ", () => {
    const voices = [v("Microsoft George - English (Great Britain)", "en-GB"), v("Microsoft David - English (United States)")];
    expect(pickVoice("Man", voices)?.name).toContain("David");
  });

  it("英語以外の声は選ばない", () => {
    const voices = [v("Microsoft Haruka - Japanese (Japan)", "ja-JP")];
    expect(pickVoice("Woman", voices)).toBeNull();
  });

  it("話者と同じ性別の声が無ければ、性別が分からない声を使う", () => {
    const voices = [v("Microsoft David - English (United States)"), v("Voice 7")];
    expect(pickVoice("Woman", voices)?.name).toBe("Voice 7");
  });

  it("使える声が無ければ null(ブラウザの既定の声に任せる)", () => {
    expect(pickVoice("Woman", [])).toBeNull();
    // 男性の声しか無いときも、女性の話者には選ばない(高さ・速さで区別する)
    expect(pickVoice("Woman", [v("Microsoft David - English (United States)")])).toBeNull();
  });

  it("lang が en_US のように下線区切りでも、米国英語として扱う", () => {
    const voices = [v("Alex", "en_GB"), v("Fred", "en_US")];
    expect(pickVoice("Man", voices)?.name).toBe("Fred");
  });

  it("元の配列は並べ替えない", () => {
    const voices = [v("Microsoft George - English (Great Britain)", "en-GB"), v("Microsoft David - English (United States)")];
    const before = voices.map((x) => x.name);
    pickVoice("Man", voices);
    expect(voices.map((x) => x.name)).toEqual(before);
  });
});
