import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { GrammarQuestion, GrammarAnswerResult } from "../../api/client";
import { LETTERS, shuffle } from "../shuffle";
import WordCapture from "../../features/wordbook/WordCapture";
import { useQuizKeys, type QuizKeyActions } from "../quizKeys";
import { addToTally, EMPTY_TALLY, type Tally } from "../sessionTally";
import Header from "./Header";
import QuestionNumber from "./QuestionNumber";
import SessionSummary from "./SessionSummary";

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
  /** exclude: 画面に表示中の問題の ID(先読みで同じ問題を選ばせない)。難易度はホームで選んだもの(呼び出し側が渡す) */
  fetchQuestion: (exclude?: string | null) => Promise<GrammarQuestion>;
  submitAnswer: (
    questionId: string,
    selectedChoice: string,
    durationSeconds: number,
  ) => Promise<GrammarAnswerResult>;
}

/** 出題から解答までの秒数(学習時間の記録用) */
const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

/** 短文の空所に4択で答える問題(文法・語彙)の共通画面。問題文と選択肢だけを表示する */
export default function ChoiceQuiz({ fetchQuestion, submitAnswer }: ChoiceQuizProps) {
  const navigate = useNavigate();

  const [question, setQuestion] = useState<GrammarQuestion | null>(null);
  const [choices, setChoices] = useState<DisplayChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** 出題できなかったときの文言(復習モードで「今日の復習はすべて終わりました」など) */
  const [error, setError] = useState("");
  /** この画面で何問目か */
  const [count, setCount] = useState(1);
  const shownAtRef = useRef(0);
  /** 今回の練習の集計と、終了後のまとめの表示 */
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [finished, setFinished] = useState(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  // 回答中に次の問題を先読みしておき、「次の問題」を押したら待たずに表示する
  const prefetchRef = useRef<Promise<GrammarQuestion | null> | null>(null);

  const showQuestion = (data: GrammarQuestion) => {
    setQuestion(data);
    setChoices(toDisplayChoices(data));
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
      setCount((c) => c + 1);
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
      setError("");
      setResult(null);
      setSelected(null);
      try {
        const data = await fetchQuestion();
        if (!cancelled) {
          setCount(1);
          setQuestion(data);
          setChoices(toDisplayChoices(data));
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
      const seconds = secondsSince(shownAtRef.current);
      const data = await submitAnswer(question.id, choice.original, seconds);
      setResult(data);
      setTally((t) => addToTally(t, { total: 1, correct: data.correct ? 1 : 0, seconds }));
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

  // 1問も解いていなければまとめは出さずにホームへ戻る
  const handleEnd = () => (tally.answered === 0 ? handleFinish() : setFinished(true));

  const handleContinue = () => {
    setFinished(false);
    if (result) void loadQuestion();
  };

  // 解答したら「次の問題」にフォーカスを移す(Enter で続けられる。読み上げでも結果の次の操作が分かる)
  useEffect(() => {
    if (result) nextButtonRef.current?.focus();
  }, [result]);

  // キーボード: 1〜4 / A〜D で選択、(次の問題にフォーカスが無いときは)Enter で次の問題
  const keyActions = useRef<QuizKeyActions>({});
  useEffect(() => {
    keyActions.current = {
      onChoice: (index) => {
        if (result || index >= choices.length) return;
        void handleSelect(choices[index]);
      },
      onEnter: () => {
        if (result) void loadQuestion();
      },
    };
  });
  useQuizKeys(!loading && !finished && !!question && !submitting, keyActions);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[40rem] question-card bg-white border border-slate-200 rounded-md p-9">
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

          {finished && (
            <SessionSummary
              tally={tally}
              note="間違えた問題は、復習の日になるとホームの復習から解き直せます。"
              onContinue={handleContinue}
              onHome={handleFinish}
            />
          )}

          {!loading && !finished && question && (
            <WordCapture>
            <div>
              <QuestionNumber n={count} difficulty={question.difficulty} />
              <p className="font-serif text-lg text-slate-900 leading-relaxed mb-6">
                {question.sentence}
              </p>

              <div className="space-y-2" role="group" aria-label="選択肢">
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
                      aria-pressed={isSelected}
                      className={`w-full text-left border rounded px-4 py-3 text-sm transition-colors ${style}`}
                    >
                      <span className="font-mono font-semibold mr-2">
                        ({choice.label})
                      </span>
                      {choice.text}
                      {/* 正誤を色だけで伝えないよう、文字でも示す */}
                      {result && isCorrectChoice && (
                        <span className="ml-2 text-xs font-semibold text-[#6a8a3e]">✓ 正解</span>
                      )}
                      {result && isSelected && !isCorrectChoice && (
                        <span className="ml-2 text-xs font-semibold text-[#c0392b]">✕ あなたの選択</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {result && (
                <div className="mt-6 border border-slate-200 rounded-md p-5" role="status" aria-live="polite">
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
                      ref={nextButtonRef}
                      onClick={loadQuestion}
                      className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                                 hover:bg-[#23365c] transition-colors"
                    >
                      次の問題
                    </button>
                    <button
                      onClick={handleEnd}
                      className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded px-5 py-3
                                 hover:border-slate-400 transition-colors"
                    >
                      終了する
                    </button>
                  </div>
                </div>
              )}
              <p className="hidden sm:block mt-6 text-xs text-slate-400">
                キー操作: 1〜4(または A〜D)で選択 / Enter で次の問題
              </p>
            </div>
            </WordCapture>
          )}
        </div>
      </div>
    </div>
  );
}
