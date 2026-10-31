import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { GrammarQuestion, GrammarAnswerResult } from "../../api/client";
import { LETTERS, shuffle } from "../shuffle";
import Header from "./Header";

/** 画面に表示する選択肢。表示用の記号(label)と、採点に送る元の記号(original) */
interface DisplayChoice {
  label: string;
  text: string;
  original: string;
}

/** 正解の位置を覚えてしまわないよう、選択肢を毎回並べ替えて A〜D を振り直す */
function toDisplayChoices(question: GrammarQuestion): DisplayChoice[] {
  return shuffle(question.choices).map((c, i) => ({
    label: LETTERS[i],
    text: c.text,
    original: c.label,
  }));
}

interface ChoiceQuizProps {
  /** 画面上部の小見出し(例: TOEIC GRAMMAR) */
  eyebrow: string;
  title: string;
  /** exclude: 画面に表示中の問題の ID(先読みで同じ問題を選ばせない) */
  fetchQuestion: (exclude?: string | null) => Promise<GrammarQuestion>;
  submitAnswer: (
    questionId: string,
    selectedChoice: string,
    durationSeconds: number,
  ) => Promise<GrammarAnswerResult>;
}

/** 出題から解答までの秒数(学習時間の記録用) */
const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

/** 短文の空所に4択で答える問題(文法・語彙)の共通画面 */
export default function ChoiceQuiz({
  eyebrow,
  title,
  fetchQuestion,
  submitAnswer,
}: ChoiceQuizProps) {
  const navigate = useNavigate();

  const [question, setQuestion] = useState<GrammarQuestion | null>(null);
  const [choices, setChoices] = useState<DisplayChoice[]>([]);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 出題できなかったときの文言(復習モードで「今日の復習はすべて終わりました」など) */
  const [error, setError] = useState("");
  const shownAtRef = useRef(0);

  // 回答中に次の問題を先読みしておき、「次の問題」を押したら待たずに表示する
  const prefetchRef = useRef<Promise<GrammarQuestion | null> | null>(null);

  const showQuestion = (data: GrammarQuestion) => {
    setQuestion(data);
    setChoices(toDisplayChoices(data));
    setQuestionNumber((n) => n + 1);
    shownAtRef.current = Date.now();
    prefetchRef.current = fetchQuestion(data.id).catch(() => null);
  };

  const loadQuestion = async () => {
    setLoading(true);
    setQuestion(null);
    setResult(null);
    setSelected(null);
    try {
      const prefetched = prefetchRef.current ? await prefetchRef.current : null;
      prefetchRef.current = null;
      showQuestion(prefetched ?? (await fetchQuestion(question?.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "出題に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchQuestion();
        if (!cancelled) {
          setQuestion(data);
          setChoices(toDisplayChoices(data));
          setQuestionNumber((n) => n + 1);
          shownAtRef.current = Date.now();
          prefetchRef.current = fetchQuestion(data.id).catch(() => null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "出題に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchQuestion]);

  const handleSelect = async (choice: DisplayChoice) => {
    if (!question || result) return;
    setSelected(choice.label);
    setSubmitting(true);
    try {
      const data = await submitAnswer(question.id, choice.original, secondsSince(shownAtRef.current));
      setResult(data);
    } catch {
      alert("採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 正解は元の記号で返るので、画面上の記号に読み替える
  const correctLabel = result
    ? choices.find((c) => c.original === result.correctChoice)?.label
    : undefined;

  const handleFinish = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[640px] bg-white border border-slate-200 rounded-md p-9">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
                {eyebrow}
              </p>
              <h1 className="font-serif text-2xl text-slate-900">{title}</h1>
            </div>
            {questionNumber > 0 && (
              <span className="font-mono text-sm text-slate-400">
                Q{questionNumber}
              </span>
            )}
          </div>

          {loading && <p className="text-sm text-slate-400">出題中…</p>}
          {!loading && error && (
            <div>
              <p className="text-sm text-slate-600 mb-4">{error}</p>
              <button
                onClick={handleFinish}
                className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          )}

          {!loading && question && (
            <div>
              <p className="font-serif text-lg text-slate-900 leading-relaxed mb-6">
                {question.sentence}
              </p>

              <div className="space-y-2">
                {choices.map((choice) => {
                  const isSelected = selected === choice.label;
                  const isCorrectChoice = correctLabel === choice.label;

                  let style = "border-slate-200 hover:border-[#8fae4e]";
                  if (result) {
                    if (isCorrectChoice) {
                      style = "border-[#8fae4e] bg-[#f2f7ea]";
                    } else if (isSelected && !isCorrectChoice) {
                      style = "border-[#c0392b] bg-[#fbeceb]";
                    } else {
                      style = "border-slate-200 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={choice.label}
                      onClick={() => handleSelect(choice)}
                      disabled={!!result || submitting}
                      className={`w-full text-left border rounded px-4 py-3 text-sm transition-colors ${style}`}
                    >
                      <span className="font-mono font-semibold mr-2">
                        ({choice.label})
                      </span>
                      {choice.text}
                    </button>
                  );
                })}
              </div>

              {result && (
                <div className="mt-6 border border-slate-200 rounded-md p-5">
                  <p
                    className={`text-sm font-semibold mb-3 ${
                      result.correct ? "text-[#6a8a3e]" : "text-[#c0392b]"
                    }`}
                  >
                    {result.correct
                      ? "正解です"
                      : `不正解です(正解: ${correctLabel})`}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {result.explanation}
                  </p>
                  <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {result.translation}
                  </p>

                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={loadQuestion}
                      className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                                 hover:bg-[#23365c] transition-colors"
                    >
                      次の問題
                    </button>
                    <button
                      onClick={handleFinish}
                      className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded px-5 py-3
                                 hover:border-slate-400 transition-colors"
                    >
                      終了する
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
