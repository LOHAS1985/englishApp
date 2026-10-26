import { useEffect, useRef, useState } from "react";
import {
  fetchListeningScript,
  synthesizeListeningAudio,
  toAbsoluteApiUrl,
} from "../../api/client";
import { useAuth } from "../../shared/context/useAuth";

/**
 * リスニングの音声再生。サーバーで台本を音声化して再生し、
 * 失敗したときはブラウザの読み上げ機能(Web Speech API)で台本を読み上げる。
 */
export default function ListeningPlayer({ setId }: { setId: string }) {
  const { token } = useAuth();
  const [urls, setUrls] = useState<string[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "browser" | "error">("idle");
  const [playCount, setPlayCount] = useState(0);
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
    const script = await fetchListeningScript(setId, token);
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    const voiceFor = (speaker: string) =>
      voices.length === 0
        ? undefined
        : voices[(speaker === "Man" ? 1 : speaker === "Narrator" ? 2 : 0) % voices.length];
    stoppedRef.current = false;
    setStatus("browser");
    window.speechSynthesis.cancel();
    for (const line of script.split("\n")) {
      if (stoppedRef.current) break;
      const m = line.match(/^(\w+):\s*(.*)$/);
      const utterance = new SpeechSynthesisUtterance(m ? m[2] : line);
      utterance.lang = "en-US";
      utterance.voice = voiceFor(m ? m[1] : "") ?? null;
      await new Promise<void>((resolve) => {
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      });
    }
    setStatus("idle");
  };

  const handlePlay = async () => {
    setPlayCount((n) => n + 1);
    if (urls) {
      await playUrls(urls);
      return;
    }
    setStatus("loading");
    try {
      const res = await synthesizeListeningAudio(setId, token);
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

  return (
    <div className="flex flex-wrap items-center gap-3 border border-slate-200 rounded-md p-4 bg-slate-50">
      <button
        onClick={busy ? handleStop : handlePlay}
        disabled={status === "loading"}
        className="text-sm font-semibold text-white bg-[#2463a8] rounded px-5 py-2.5 disabled:bg-slate-400"
      >
        {status === "loading" ? "音声を準備中…" : busy ? "停止" : playCount === 0 ? "▶ 音声を再生" : "▶ もう一度聞く"}
      </button>
      <span className="text-xs text-slate-500">
        再生回数: {playCount}
        {playCount > 1 && "(本番では英検は1回、TOEIC は1回のみ)"}
      </span>
      {status === "browser" && (
        <span className="text-xs text-slate-500">サーバーの音声を準備できなかったため、ブラウザの読み上げで再生しています</span>
      )}
      {status === "error" && (
        <span className="text-xs text-[#c0392b]">音声を再生できませんでした</span>
      )}
    </div>
  );
}
