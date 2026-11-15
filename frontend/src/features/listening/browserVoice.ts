/**
 * ブラウザの読み上げ(Web Speech API)で、話者の性別に合う声を選ぶ。
 * サーバーの音声が作れないときのフォールバックで使う。声を順番だけで割り当てると、
 * Man も Woman も同じ男性の声になることがあったので、声の名前から性別を判断して選ぶ。
 */
export type Gender = "female" | "male";

/** 選ぶのに必要な部分だけ(テストでは SpeechSynthesisVoice の代わりに使う) */
export interface VoiceLike {
  name: string;
  lang: string;
}

// ブラウザの声は性別の情報を持たないので、名前から判断する。"female" は "male" を含むので、女性を先に判定する
const FEMALE_NAMES =
  /zira|samantha|susan|hazel|jenny|aria|ava\b|emma|female|karen|moira|tessa|victoria|serena|fiona|catherine|linda|heather|sonia|libby|natasha|clara|allison|joanna|kendra|kimberly|salli|amy|ivy|nicole|raveena|veena|google us english/i;
const MALE_NAMES =
  /david|mark|guy|daniel|alex\b|fred|george|james|ryan|christopher|eric|male|thomas|oliver|richard|brian|aaron|arthur|liam|roger|matthew|joey|justin|kevin|russell|geraint|rishi|ravi/i;

/** 声の性別。名前から分からないときは null */
export function genderOfVoice(voice: VoiceLike): Gender | null {
  if (FEMALE_NAMES.test(voice.name)) return "female";
  if (MALE_NAMES.test(voice.name)) return "male";
  return null;
}

/**
 * 台本の話者の性別と、同じ性別の中で何番目の声を使うか。
 * サーバーの音声(Narrator は男性の別の声、Man 2 / Woman 2 は2人目の声)に合わせる。
 */
const SPEAKER_VOICE: Record<string, { gender: Gender; nth: number }> = {
  Man: { gender: "male", nth: 0 },
  Narrator: { gender: "male", nth: 1 },
  "Man 2": { gender: "male", nth: 2 },
  Woman: { gender: "female", nth: 0 },
  "Woman 2": { gender: "female", nth: 1 },
};

export function speakerVoiceSlot(speaker: string): { gender: Gender; nth: number } {
  const known = SPEAKER_VOICE[speaker];
  if (known) return known;
  // 知らない話者名は、名前から性別を推測する("Woman 3" など)
  return /^woman|^female|^she\b/i.test(speaker) ? { gender: "female", nth: 0 } : { gender: "male", nth: 0 };
}

const isEnglish = (v: VoiceLike) => v.lang.toLowerCase().replace("_", "-").startsWith("en");
const isUs = (v: VoiceLike) => v.lang.toLowerCase().replace("_", "-") === "en-us";

/**
 * 話者に合う声を選ぶ。英語の声のうち、米国英語を先にして、話者と同じ性別の声から選ぶ。
 * 同じ性別の声が足りなければ順番を回し、同じ性別の声が1つも無ければ、性別が分からない声を使う。
 * それも無ければ null(ブラウザの既定の声。高さ・速さの違いで区別する)。
 */
export function pickVoice<T extends VoiceLike>(speaker: string, voices: T[]): T | null {
  const { gender, nth } = speakerVoiceSlot(speaker);
  // 米国英語を先に並べる(並べ替えは安定なので、同じ地域の中では元の順を保つ)
  const english = voices.filter(isEnglish).sort((a, b) => Number(isUs(b)) - Number(isUs(a)));
  const sameGender = english.filter((v) => genderOfVoice(v) === gender);
  const pool = sameGender.length > 0 ? sameGender : english.filter((v) => genderOfVoice(v) === null);
  return pool.length > 0 ? (pool[nth % pool.length] ?? null) : null;
}

/**
 * ブラウザの声の一覧を取る。Chrome などは最初は空で、あとから読み込まれるので、
 * 空のときは読み込みの通知を少し待つ(待ちきれなければ空のまま返す)。
 */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener("voiceschanged", done);
  });
}
