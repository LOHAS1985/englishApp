import { useState, useMemo } from "react";
import {
  fetchWritingQuestion,
  scoreWritingAnswer,
  type ScoreResult,
} from "../api/client";
import Header from "../components/Header";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";

const TARGET_MIN = 120;
const TARGET_MAX = 150;

const CRITERIA: { key: keyof Omit<ScoreResult, "total">; label: string }[] = [
  { key: "content", label: "内容" },
  { key: "structure", label: "構成" },
  { key: "vocabulary", label: "語彙" },
  { key: "grammar", label: "文法" },
];

export default function Writing() {
  const [question, setQuestion] = useState<{
    prompt: string;
    topic: string;
    points: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);

  const { token } = useAuth();
  const navigate = useNavigate();

  const wordCount = useMemo(() => {
    const trimmed = answer.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  }, [answer]);

  const countState =
    wordCount === 0
      ? "empty"
      : wordCount < TARGET_MIN
        ? "under"
        : wordCount <= TARGET_MAX
          ? "in-range"
          : "over";

  const countColor =
    countState === "in-range"
      ? "text-[#6a8a3e]"
      : countState === "over"
        ? "text-[#c0392b]"
        : "text-slate-400";

  const barColor =
    countState === "in-range"
      ? "bg-[#8fae4e]"
      : countState === "over"
        ? "bg-[#c0392b]"
        : "bg-slate-300";

  const progress = Math.min(wordCount / TARGET_MAX, 1) * 100;

  const handleFetch = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchWritingQuestion();
      setQuestion(data);
      setAnswer("");
    } catch {
      alert("取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    if (!question) return;
    if (!token) {
      navigate("/login");
      return;
    }
    setScoring(true);
    try {
      const data = await scoreWritingAnswer(
        question.topic,
        question.prompt,
        question.points,
        answer,
        token,
      );
      setResult(data);
    } catch {
      alert("採点に失敗しました");
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex justify-center px-5 py-12">
      <div className="w-full max-w-[640px] bg-white border border-slate-200 rounded-md p-9">
        <Header />
        <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
          WRITING TEST
        </p>
        <h1 className="font-serif text-2xl text-slate-900 mb-6">
          ライティング問題
        </h1>

        <button
          onClick={handleFetch}
          disabled={loading}
          className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                     hover:bg-[#23365c] disabled:bg-slate-400 disabled:cursor-default
                     transition-colors"
        >
          {loading ? "出題中…" : "問題を出題する"}
        </button>

        {question && (
          <>
            <div className="mt-8 pl-4 border-l-4 border-[#8fae4e]">
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {question.prompt}
              </p>
              <h2 className="font-serif text-lg text-slate-900 mb-3 leading-relaxed">
                {question.topic}
              </h2>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                {question.points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="mt-7">
              <label
                htmlFor="answer"
                className="block font-mono text-xs font-semibold tracking-wide text-slate-400 mb-2"
              >
                回答
              </label>
              <textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="ここに解答を入力してください"
                rows={10}
                className="w-full font-serif text-[15px] leading-[36px] text-slate-900
                           border border-slate-200 rounded px-3.5 py-2 resize-y
                           focus:outline-2 focus:outline-[#8fae4e] focus:outline-offset-1"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent 0, transparent 35px, #e3e6ec 35px, #e3e6ec 36px)",
                }}
              />

              <div className="flex justify-between items-baseline mt-2.5">
                <span
                  className={`font-mono text-[15px] font-semibold ${countColor}`}
                >
                  {wordCount}
                  <span className="font-normal text-slate-300"> words</span>
                </span>
                <span className="font-mono text-xs text-slate-300">
                  目安 {TARGET_MIN}–{TARGET_MAX}語
                </span>
              </div>
              <div className="h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${barColor}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <button
                onClick={handleScore}
                disabled={scoring || wordCount === 0}
                className="mt-5 text-sm font-semibold text-white bg-[#8fae4e] rounded px-5 py-3
                           hover:bg-[#7a9843] disabled:bg-slate-400 disabled:cursor-default
                           transition-colors"
              >
                {scoring ? "採点中…" : "採点する"}
              </button>

              {result && (
                <div className="mt-6 border border-slate-200 rounded-md p-6">
                  <div className="flex items-baseline justify-between mb-5">
                    <span className="font-mono text-xs font-semibold tracking-widest text-slate-400">
                      SCORE
                    </span>
                    <span className="font-mono text-3xl font-semibold text-slate-900">
                      {result.total}
                      <span className="text-base text-slate-400"> / 16</span>
                    </span>
                  </div>

                  <div className="space-y-4">
                    {CRITERIA.map(({ key, label }) => {
                      const criterion = result[key];
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-900">
                              {label}
                            </span>
                            <span className="font-mono text-sm text-slate-500">
                              {criterion.score} / 4
                            </span>
                          </div>
                          <div className="h-1 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                            <div
                              className="h-full bg-[#8fae4e]"
                              style={{
                                width: `${(criterion.score / 4) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {criterion.feedback}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
