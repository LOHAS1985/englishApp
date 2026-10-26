import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { GrammarQuestion, GrammarAnswerResult } from "../../api/client";
import { useAuth } from "../context/useAuth";
import Header from "./Header";

interface ChoiceQuizProps {
  /** 画面上部の小見出し(例: TOEIC GRAMMAR) */
  eyebrow: string;
  title: string;
  fetchQuestion: () => Promise<GrammarQuestion>;
  submitAnswer: (
    questionId: string,
    selectedChoice: string,
    token: string,
  ) => Promise<GrammarAnswerResult>;
}

/** 短文の空所に4択で答える問題(文法・語彙)の共通画面 */
export default function ChoiceQuiz({
  eyebrow,
  title,
  fetchQuestion,
  submitAnswer,
}: ChoiceQuizProps) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<GrammarQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 回答中に次の問題を先読みしておき、「次の問題」を押したら待たずに表示する
  const prefetchRef = useRef<Promise<GrammarQuestion | null> | null>(null);

  const prefetchNext = () => {
    prefetchRef.current = fetchQuestion().catch(() => null);
  };

  const showQuestion = (data: GrammarQuestion) => {
    setQuestion(data);
    setQuestionNumber((n) => n + 1);
    prefetchNext();
  };

  const loadQuestion = async () => {
    setLoading(true);
    setQuestion(null);
    setResult(null);
    setSelected(null);
    try {
      const prefetched = prefetchRef.current ? await prefetchRef.current : null;
      prefetchRef.current = null;
      showQuestion(prefetched ?? (await fetchQuestion()));
    } catch {
      alert("出題に失敗しました");
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
          setQuestionNumber((n) => n + 1);
          prefetchRef.current = fetchQuestion().catch(() => null);
        }
      } catch {
        if (!cancelled) alert("出題に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [fetchQuestion]);

  const handleSelect = async (label: string) => {
    if (!question || result) return;
    if (!token) {
      navigate("/login");
      return;
    }
    setSelected(label);
    setSubmitting(true);
    try {
      const data = await submitAnswer(question.id, label, token);
      setResult(data);
    } catch {
      alert("採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

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

          {!loading && question && (
            <div>
              <p className="font-serif text-lg text-slate-900 leading-relaxed mb-6">
                {question.sentence}
              </p>

              <div className="space-y-2">
                {question.choices.map((choice) => {
                  const isSelected = selected === choice.label;
                  const isCorrectChoice =
                    result?.correctChoice === choice.label;

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
                      onClick={() => handleSelect(choice.label)}
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
                      : `不正解です(正解: ${result.correctChoice})`}
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
