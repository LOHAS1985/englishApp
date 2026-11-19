import { loadVoices, type VoiceLike } from "../listening/browserVoice";

/**
 * 単語の読み方を、ブラウザの読み上げ(Web Speech API。無料)で再生する。
 * サーバーの音声(edge-tts)は台本ごとに作るもので、1語ずつ作ると遅く、Render のディスクにも残らないため使わない。
 */

/** 読み上げに使える環境か(古いブラウザ・一部のアプリ内ブラウザには無い) */
export function canPronounce(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

const normalized = (v: VoiceLike) => v.lang.toLowerCase().replace("_", "-");

/** 米国英語の声を優先し、無ければ他の英語の声。英語の声が無ければ null(既定の声に lang だけ指定する) */
export function pickWordVoice<T extends VoiceLike>(voices: T[]): T | null {
  return voices.find((v) => normalized(v) === "en-us") ?? voices.find((v) => normalized(v).startsWith("en")) ?? null;
}

/** 1語を読み上げる。再生中の読み上げは止めてから読む(連打しても重ならない) */
export async function pronounce(text: string): Promise<void> {
  if (!canPronounce() || text.trim() === "") return;
  const synth = window.speechSynthesis;
  const voice = pickWordVoice(await loadVoices());
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? "en-US";
  if (voice) utterance.voice = voice;
  // 単語だけだと速く聞こえるので、少し遅くする
  utterance.rate = 0.85;
  synth.speak(utterance);
}
