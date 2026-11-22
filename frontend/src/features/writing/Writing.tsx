import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchWritingQuestion,
  scoreWritingAnswer,
  type ScoreResult,
  type WritingQuestion,
  type WritingType,
} from "../../api/client";
import Header from "../../shared/components/Header";
import QuestionNumber from "../../shared/components/QuestionNumber";
import { clearDraft, loadDraft, saveDraft } from "../../shared/draft";

const CRITERIA: { key: keyof Omit<ScoreResult, "total">; label: string }[] = [
  { key: "content", label: "内容" },
  { key: "structure", label: "構成" },
  { key: "vocabulary", label: "語彙" },
  { key: "grammar", label: "文法" },
];

export default function Writing() {
  // ホームのメニューから ?type=summary などで開かれる
  const [searchParams] = useSearchParams();
  const type: WritingType = searchParams.get("type") === "summary" ? "summary" : "opinion";
  const [question, setQuestion] = useState<WritingQuestion | null>(null);
  // 下書きがあるときは、復元するお題を取得し終えるまで「出題中」にする
  const [loading, setLoading] = useState(() => loadDraft<string>(`writing-${type}`) !== null);
  const [answer, setAnswer] = useState("");
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  /** この画面で何問目か(お題を出すたびに増える) */
  const [count, setCount] = useState(0);
  /** お題を表示した時刻(学習時間の記録用) */
  const shownAtRef = useRef(0);
  /** 下書きを復元して始めたか(その旨を一言出す) */
  const [restored, setRestored] = useState(false);
  /** 形式ごとに下書きを1つ持つ(意見論述の途中で要約を開いても、意見論述の下書きは残る) */
  const draftFeature = `writing-${type}`;
  /** 下書きのお題を取得できなかった(サーバーが起動中など)。下書きは残してあるので、再試行を促す */
  const [restoreFailed, setRestoreFailed] = useState(false);
  const [restoreKey, setRestoreKey] = useState(0);

  // 前回の途中の答案があれば、同じお題を出し直して続きから書けるようにする
  useEffect(() => {
    const draft = loadDraft<string>(draftFeature);
    if (!draft) return;
    let cancelled = false;
    fetchWritingQuestion(type, null, draft.id)
      .then((data) => {
        if (cancelled) return;
        setQuestion(data);
        setCount(1);
        shownAtRef.current = Date.now();
        // 問題集から外れていて別のお題が返ったときは、下書きを使わない
        if (data.id === draft.id) {
          setAnswer(draft.value);
          setRestored(true);
        } else {
          clearDraft(draftFeature);
        }
      })
      .catch(() => !cancelled && setRestoreFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [type, draftFeature, restoreKey]);

  // 入力のたびに下書きを保存する(採点後は不要なので消す)
  useEffect(() => {
    if (!question || result) return;
    if (answer.trim() === "") clearDraft(draftFeature);
    else saveDraft(draftFeature, question.id, answer);
  }, [answer, question, result, draftFeature]);


  const wordCount = useMemo(() => {
    const trimmed = answer.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  }, [answer]);

  const TARGET_MIN = question?.minWords ?? 120;
  const TARGET_MAX = question?.maxWords ?? 150;

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
    // 下書きを取り戻せていないのに新しいお題を出すと、下書きが消える(答えが空のお題で、保存の処理が下書きを消すため)
    if (!question && loadDraft<string>(draftFeature) !== null) {
      const discard = window.confirm("前回の下書きが残っています。破棄して、新しいお題を出しますか?");
      if (!discard) return;
      clearDraft(draftFeature);
      setRestoreFailed(false);
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchWritingQuestion(type, question?.id);
      setQuestion(data);
      setCount((c) => c + 1);
      setAnswer("");
      setRestored(false);
      shownAtRef.current = Date.now();
    } catch {
      alert("取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleScore = async () => {
    if (!question) return;
    setScoring(true);
    try {
      const data = await scoreWritingAnswer(
        question.id,
        answer,
        Math.round((Date.now() - shownAtRef.current) / 1000),
      );
      setResult(data);
      clearDraft(draftFeature);
    } catch (e: unknown) {
      // AI のレート制限などはサーバーが理由を返すので、そのまま見せる
      alert(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[40rem] question-card bg-white border border-slate-200 rounded-md p-9">
          {/* 形式(意見論述・要約)はホームで選ぶ。お題は採点に AI を使うサーバーから出す */}
          {!question && restoreFailed && (
            <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-slate-700">
              前回の下書きのお題を取得できませんでした(サーバーが起動中の可能性があります)。下書きは残してあります。
              <button
                onClick={() => {
                  setRestoreFailed(false);
                  setLoading(true);
                  setRestoreKey((k) => k + 1);
                }}
                className="ml-2 text-[#2463a8] hover:underline"
              >
                もう一度試す
              </button>
            </div>
          )}

          {!question && (
            <button
              onClick={handleFetch}
              disabled={loading}
              className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                       hover:bg-[#23365c] disabled:bg-slate-400 disabled:cursor-default
                       transition-colors"
            >
              {loading ? "出題中…" : "問題を出題する"}
            </button>
          )}

          {question && (
            <>
              <QuestionNumber n={count} />
              <div className="pl-4 border-l-4 border-[#8fae4e]">
                <p className="text-sm text-slate-600 leading-relaxed mb-3">
                  {question.prompt}
                </p>
                <h2 className="font-serif text-lg text-slate-900 mb-3 leading-relaxed">
                  {question.topic}
                </h2>
                {question.passage && (
                  <p className="font-serif text-[0.9375rem] leading-7 text-slate-800 whitespace-pre-wrap">
                    {question.passage}
                  </p>
                )}
                {question.points.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                    {question.points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-7">
                <label
                  htmlFor="answer"
                  className="block font-mono text-xs font-semibold tracking-wide text-slate-400 mb-2"
                >
                  回答
                  {restored && (
                    <span className="ml-3 font-sans font-normal text-[#6a8a3e]">前回の下書きを復元しました</span>
                  )}
                </label>
                <textarea
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="ここに解答を入力してください"
                  rows={10}
                  className="w-full font-serif text-[0.9375rem] leading-9 text-slate-900
                           border border-slate-200 rounded px-3.5 py-2 resize-y
                           focus:outline-2 focus:outline-[#8fae4e] focus:outline-offset-1"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(to bottom, transparent 0, transparent 2.1875rem, #e3e6ec 2.1875rem, #e3e6ec 2.25rem)",
                  }}
                />

                <div className="flex justify-between items-baseline mt-2.5">
                  <span
                    className={`font-mono text-[0.9375rem] font-semibold ${countColor}`}
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
                    <button
                      onClick={handleFetch}
                      disabled={loading}
                      className="mt-6 text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                               hover:bg-[#23365c] disabled:bg-slate-400 transition-colors"
                    >
                      {loading ? "出題中…" : "次のお題"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
