import { useEffect, useRef, useState } from "react";
import {
  fetchListeningScript,
  synthesizeListeningAudio,
  toAbsoluteApiUrl,
} from "../../api/client";

/**
 * 話者ごとの読み上げの高さ・速さ。ブラウザの声が1種類しか無くても、話者の区別がつくようにする
 * (サーバーの音声では話者ごとに別の声を使う)。
 */
const SPEAKER_STYLE: Record<string, { pitch: number; rate: number }> = {
  Narrator: { pitch: 1, rate: 0.95 },
  Woman: { pitch: 1.3, rate: 1 },
  Man: { pitch: 0.75, rate: 0.95 },
  "Woman 2": { pitch: 1.5, rate: 1.05 },
  "Man 2": { pitch: 0.6, rate: 0.9 },
};

/**
 * リスニングの音声再生。サーバーで台本を音声化して再生し、
 * 失敗したときはブラウザの読み上げ機能(Web Speech API)で台本を読み上げる。
 * allowReplay=false のときは1回聞いたら聞き直せない(模試の本番と同じ条件)。
 */
export default function ListeningPlayer({ setId, allowReplay = true }: { setId: string; allowReplay?: boolean }) {
  const [urls, setUrls] = useState<string[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "browser" | "error">("idle");
  const [played, setPlayed] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stoppedRef = useRef(false);

  // 別の問題に切り替わったら再生を止める
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      audioRef.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [setId]);

  const playUrls = async (list: string[]) => {
    stoppedRef.current = false;
    setStatus("playing");
    for (const src of list) {
      if (stoppedRef.current) break;
      await new Promise<void>((resolve) => {
        const audio = new Audio(src);
        audioRef.current = audio;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    }
    setStatus("idle");
  };

  const playWithBrowser = async () => {
    if (!("speechSynthesis" in window)) {
      setStatus("error");
      return;
    }
    const script = await fetchListeningScript(setId);
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    stoppedRef.current = false;
    setStatus("browser");
    window.speechSynthesis.cancel();
    for (const [i, line] of script.split("\n").entries()) {
      if (stoppedRef.current) break;
      const m = line.match(/^(\w+(?: \d)?):\s*(.*)$/);
      const speaker = m ? m[1] : "Narrator";
      // TOEIC Part 2 は「Number N.」の前に解答時間を取る(サーバーの音声と同じ)
      if (i > 0 && m && /^Number \d+\.$/.test(m[2])) {
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
      const utterance = new SpeechSynthesisUtterance(m ? m[2] : line);
      utterance.lang = "en-US";
      const style = SPEAKER_STYLE[speaker] ?? SPEAKER_STYLE.Narrator;
      utterance.pitch = style.pitch;
      utterance.rate = style.rate;
      // 声が2種類以上あるときは、話者ごとに別の声を使う
      const slot = Math.max(0, Object.keys(SPEAKER_STYLE).indexOf(speaker));
      utterance.voice = voices.length > 1 ? voices[slot % voices.length] : null;
      await new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
    setStatus("idle");
  };

  const handlePlay = async () => {
    setPlayed(true);
    if (urls) {
      await playUrls(urls);
      return;
    }
    setStatus("loading");
    try {
      const res = await synthesizeListeningAudio(setId);
      const list = (res.audioUrls ?? (res.audioUrl ? [res.audioUrl] : [])).map(toAbsoluteApiUrl);
      if (list.length === 0) throw new Error("no audio");
      setUrls(list);
      await playUrls(list);
    } catch {
      await playWithBrowser();
    }
  };

  const handleStop = () => {
    stoppedRef.current = true;
    audioRef.current?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setStatus("idle");
  };

  const busy = status === "loading" || status === "playing" || status === "browser";
  const replayBlocked = played && !allowReplay;

  return (
    <div className="flex flex-wrap items-center gap-3 border border-slate-200 rounded-md p-4 bg-slate-50">
      <button
        onClick={busy ? handleStop : handlePlay}
        disabled={status === "loading" || (replayBlocked && !busy)}
        className="text-sm font-semibold text-white bg-[#2463a8] rounded px-5 py-2.5 disabled:bg-slate-400"
      >
        {status === "loading"
          ? "音声を準備中…"
          : busy
            ? "停止"
            : replayBlocked
              ? "再生済み(もう一度は聞けません)"
              : played
                ? "▶ もう一度聞く"
                : "▶ 音声を再生"}
      </button>
      {status === "error" && (
        <span className="text-xs text-[#c0392b]">音声を再生できませんでした</span>
      )}
    </div>
  );
}
