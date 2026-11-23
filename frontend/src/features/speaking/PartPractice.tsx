import { useState } from "react";
import { scoreSpeakingAnswer, type SpeakingScoreResult } from "../../api/client";
import Recorder from "./Recorder";
import { getRecognitionConstructor } from "./speechRecognition";
import { messageOf } from "../../shared/errorMessage";

const CRITERIA: { key: keyof Pick<SpeakingScoreResult, "content" | "structure" | "vocabulary" | "grammar">; label: string }[] = [
  { key: "content", label: "内容" },
  { key: "structure", label: "構成" },
  { key: "vocabulary", label: "語彙" },
  { key: "grammar", label: "文法" },
];

interface Props {
  setId: string;
  /** 1 = ナレーション、2〜4 = Q&A の質問番号 */
  part: number;
  maxSeconds: number;
  /** 採点して記録が残ったとき(学習ログを二重に付けないために使う) */
  onScored?: () => void;
  /** 復元した下書きの文字起こし(最初の1回だけ使う) */
  initialTranscript?: string;
  /** 文字起こしが変わったとき(下書きの保存用) */
  onTranscriptChange?: (text: string) => void;
}

/**
 * 1パートの練習。録音しながら音声認識で文字起こしし、利用者が直した文字起こしを AI で採点する。
 * 採点するのは文字起こしだけで、発音・抑揚・間は採点されない。
 */
export default function PartPractice({
  setId,
  part,
  maxSeconds,
  onScored,
  initialTranscript = "",
  onTranscriptChange,
}: Props) {
  const [transcript, setTranscriptState] = useState(initialTranscript);
  const [seconds, setSeconds] = useState<number | undefined>(undefined);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<SpeakingScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supported = getRecognitionConstructor() !== null;

  const setTranscript = (text: string) => {
    setTranscriptState(text);
    onTranscriptChange?.(text);
  };

  const handleScore = async () => {
    setScoring(true);
    setError(null);
    try {
      setResult(await scoreSpeakingAnswer(setId, part, transcript, seconds));
      onScored?.();
    } catch (e) {
      setError(messageOf(e, "採点に失敗しました"));
    } finally {
      setScoring(false);
    }
  };

  return (
    <div>
      <Recorder
        maxSeconds={maxSeconds}
        onTranscript={(text) => {
          setTranscript(text);
          setResult(null);
        }}
        onStop={setSeconds}
      />

      <div className="mt-4">
        <label className="block font-mono text-xs font-semibold tracking-wide text-slate-400 mb-1.5">
          文字起こし(AI 採点の対象)
        </label>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={4}
          placeholder={
            supported
              ? "録音すると、ここに文字起こしされます"
              : "音声認識に対応していないため、ここに入力してください"
          }
          className="w-full font-serif text-[0.9375rem] leading-7 text-slate-900 border border-slate-200 rounded px-3 py-2 resize-y
                     focus:outline-2 focus:outline-[#8fae4e] focus:outline-offset-1"
        />
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <button
            onClick={handleScore}
            disabled={scoring || transcript.trim() === ""}
            className="text-sm font-semibold text-white bg-[#16233d] rounded px-4 py-2 hover:bg-[#23365c]
                       disabled:bg-slate-400 disabled:cursor-default transition-colors"
          >
            {scoring ? "採点中…" : "AI に採点してもらう"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-[#c0392b]">{error}</p>}
      </div>

      {result && (
        <div className="mt-4 border border-slate-200 rounded-md p-4">
          <div className="flex items-baseline justify-between mb-4">
            <span className="font-mono text-xs font-semibold tracking-widest text-slate-400">SCORE</span>
            <span className="font-mono text-2xl font-semibold text-slate-900">
              {result.total}
              <span className="text-sm text-slate-400"> / 16</span>
            </span>
          </div>
          <div className="space-y-3">
            {CRITERIA.map(({ key, label }) => {
              const criterion = result[key];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-900">{label}</span>
                    <span className="font-mono text-sm text-slate-500">{criterion.score} / 4</span>
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                    <div className="h-full bg-[#8fae4e]" style={{ width: `${(criterion.score / 4) * 100}%` }} />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{criterion.feedback}</p>
                </div>
              );
            })}
          </div>
          {result.betterAnswer && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-900 mb-1">あなたの答えを直した例</p>
              <p className="text-sm text-slate-700 leading-relaxed font-serif bg-slate-50 rounded p-3">
                {result.betterAnswer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
