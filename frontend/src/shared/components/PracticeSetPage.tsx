import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  fetchPracticeSet,
  submitPracticeAnswers,
  type QuestionSetView,
  type SetAnswerResult,
} from "../../api/client";
import { LETTERS, shuffle } from "../shuffle";
import { levelFromParams } from "../level";
import Header from "./Header";
import QuestionNumber from "./QuestionNumber";

interface PracticeSetPageProps {
  feature: "reading" | "listening";
  /** 形式(type)の一覧。?type= が無いときは先頭の形式を出す */
  types: string[];
  /** セットの題名を出すか(リスニングは題名で内容が分かってしまうので出さない) */
  showTitle: boolean;
  /** 設問の上に表示する教材(読解の本文、リスニングの再生ボタンなど) */
  renderMaterial: (set: QuestionSetView, result: SetAnswerResult | null) => ReactNode;
  /** 解答後に、設問ごとに表示する教材(TOEIC Part 2 の各問題の台本など) */
  renderQuestionNote?: (set: QuestionSetView, result: SetAnswerResult, qi: number) => ReactNode;
  /** 解答後に、設問の後ろに表示する教材(台本・和訳など) */
  renderAfterAnswer?: (set: QuestionSetView, result: SetAnswerResult) => ReactNode;
}

/**
 * 文章または音声1つに複数の設問が付くセット問題(読解・リスニング)の共通画面。
 * 形式(?type=)と難易度(?level=)はホームで選ぶので、ここでは教材と設問だけを表示する。
 */
export default function PracticeSetPage({
  feature,
  types,
  showTitle,
  renderMaterial,
  renderQuestionNote,
  renderAfterAnswer,
}: PracticeSetPageProps) {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const type = requestedType && types.includes(requestedType) ? requestedType : types[0];
  const level = levelFromParams(searchParams);
  const [set, setSet] = useState<QuestionSetView | null>(null);
  /** 解答(元の記号)。採点にはこの記号を送る */
  const [answers, setAnswers] = useState<string[]>([]);
  /** 設問ごとの選択肢の表示順(元の位置の並び)。正解の位置を覚えないよう毎回並べ替える */
  const [order, setOrder] = useState<number[][]>([]);
  const [result, setResult] = useState<SetAnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  /** この画面で何問目(何セット目)か */
  const [count, setCount] = useState(1);
  /** セットを表示した時刻(学習時間の記録用) */
  const shownAtRef = useRef(0);

  const showSet = (data: QuestionSetView | null) => {
    shownAtRef.current = Date.now();
    setSet(data);
    setAnswers(data ? data.questions.map(() => "") : []);
    // 選択肢が音声だけの形式(TOEIC Part 2)は文字が空で届き、音声の (A)〜(C) の順と合わせるため並べ替えない
    setOrder(
      data
        ? data.questions.map((q) =>
            q.choices.every((c) => c === "")
              ? q.choices.map((_, i) => i)
              : shuffle(q.choices.map((_, i) => i)),
          )
        : [],
    );
    setResult(null);
    setError(data ? "" : "問題の取得に失敗しました。この形式の問題がまだ無い可能性があります。");
    setLoading(false);
  };

  // 「次の問題」用。表示中のセットはサーバー側で候補から外す
  const loadNext = async () => {
    setLoading(true);
    try {
      const data = await fetchPracticeSet(feature, type, set?.id, level);
      showSet(data);
      if (data) setCount((c) => c + 1);
    } catch {
      showSet(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchPracticeSet(feature, type, undefined, level)
      .then((data) => {
        if (cancelled) return;
        setCount(1);
        showSet(data);
      })
      .catch(() => !cancelled && showSet(null));
    return () => {
      cancelled = true;
    };
  }, [feature, type, level]);

  const handleSubmit = async () => {
    if (!set) return;
    setSubmitting(true);
    try {
      setResult(
        await submitPracticeAnswers(
          feature,
          set.id,
          answers,
          Math.round((Date.now() - shownAtRef.current) / 1000),
        ),
      );
    } catch {
      alert("採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const allAnswered = answers.length > 0 && answers.every((a) => a !== "");

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-4 py-8 sm:px-5 sm:py-12">
        <div className="w-full max-w-[760px] bg-white border border-slate-200 rounded-md p-5 sm:p-8">
          {loading && <p className="text-sm text-slate-400">出題中…</p>}
          {error && <p className="text-sm text-[#c0392b]">{error}</p>}

          {!loading && set && (
            <div>
              <QuestionNumber n={count} />
              {showTitle && <h2 className="font-serif text-lg text-slate-900 mb-3">{set.title}</h2>}
              {set.situation && (
                <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                  <span className="font-semibold">Situation: </span>
                  {set.situation}
                </p>
              )}

              {set.graphic && (
                <pre className="text-xs sm:text-sm font-mono text-slate-800 bg-white border border-slate-300 rounded p-3 mb-4 overflow-x-auto">
                  {set.graphic}
                </pre>
              )}

              {renderMaterial(set, result)}

              <div className="space-y-5 mt-6">
                {set.questions.map((q, qi) => {
                  const r = result?.results[qi];
                  const qOrder = order[qi] ?? q.choices.map((_, i) => i);
                  // 正解・選択は元の記号なので、画面上の記号に読み替えて表示する
                  const toDisplay = (original: string) =>
                    LETTERS[qOrder.indexOf(LETTERS.indexOf(original))];
                  return (
                    <div key={qi} className="border border-slate-200 rounded-md p-4">
                      <p className="text-sm font-semibold text-slate-900 mb-3">
                        {q.question ? `Q${qi + 1}. ${q.question}` : `No. ${qi + 1}`}
                      </p>
                      <div className="space-y-2">
                        {qOrder.map((originalIndex, ci) => {
                          const letter = LETTERS[ci];
                          const original = LETTERS[originalIndex];
                          const choice = q.choices[originalIndex];
                          const isSelected = answers[qi] === original;
                          let style = isSelected
                            ? "border-[#8fae4e] bg-[#f2f7ea]"
                            : "border-slate-200 hover:border-[#8fae4e]";
                          if (r) {
                            if (original === r.answer) style = "border-[#8fae4e] bg-[#f2f7ea]";
                            else if (isSelected) style = "border-[#c0392b] bg-[#fbeceb]";
                            else style = "border-slate-200 opacity-60";
                          }
                          return (
                            <button
                              key={letter}
                              disabled={!!result}
                              onClick={() =>
                                setAnswers((prev) => prev.map((a, i) => (i === qi ? original : a)))
                              }
                              className={`w-full text-left border rounded px-3 py-2.5 text-sm transition-colors ${style}`}
                            >
                              <span className="font-mono font-semibold mr-2">({letter})</span>
                              {choice}
                            </button>
                          );
                        })}
                      </div>
                      {r && (
                        <div className="mt-3 text-sm leading-relaxed">
                          <p className={`font-semibold ${r.correct ? "text-[#6a8a3e]" : "text-[#c0392b]"}`}>
                            {r.correct ? "正解" : `不正解(正解: ${toDisplay(r.answer)})`}
                          </p>
                          <p className="text-slate-600 mt-1">{r.explanation}</p>
                        </div>
                      )}
                      {result && renderQuestionNote?.(set, result, qi)}
                    </div>
                  );
                })}
              </div>

              {!result ? (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered || submitting}
                  className="mt-6 text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                             hover:bg-[#23365c] disabled:bg-slate-400 disabled:cursor-default transition-colors"
                >
                  {submitting ? "採点中…" : allAnswered ? "解答する" : "すべての設問に答えてください"}
                </button>
              ) : (
                <div className="mt-6">
                  <p className="font-mono text-lg font-semibold text-slate-900 mb-4">
                    {result.score} / {result.total}
                  </p>
                  {renderAfterAnswer?.(set, result)}
                  <button
                    onClick={loadNext}
                    className="text-sm font-semibold text-white bg-[#8fae4e] rounded px-5 py-3 hover:bg-[#7a9843] transition-colors"
                  >
                    次の問題
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
