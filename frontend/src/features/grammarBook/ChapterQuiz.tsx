import { useState } from "react";
import type { QuizQuestion } from "../../content/grammarBook/types";
import { recordQuiz } from "./bookProgress";
import { Inline } from "./RichText";

interface ChapterQuizProps {
  chapterId: string;
  questions: QuizQuestion[];
  /** 全問に答えて、結果を保存したとき */
  onRecorded?: () => void;
}

/**
 * 章末の確認問題。1問ごとに、答えるとすぐ正誤と解説を出す。全問に答えると、点数をブラウザに保存する。
 * 選択肢の並びは問題のとおり(解説が記号で触れることがあるため、並べ替えない)。
 */
export default function ChapterQuiz({ chapterId, questions, onRecorded }: ChapterQuizProps) {
  const [selected, setSelected] = useState<(string | null)[]>(() => questions.map(() => null));

  const correctCount = questions.filter((q, i) => selected[i] === q.answer).length;
  const finished = selected.every((s) => s !== null);

  const choose = (index: number, label: string) => {
    if (selected[index] !== null) return;
    const next = [...selected];
    next[index] = label;
    setSelected(next);
    if (next.every((s) => s !== null)) {
      recordQuiz(chapterId, questions.filter((q, i) => next[i] === q.answer).length, questions.length);
      onRecorded?.();
    }
  };

  return (
    <div>
      <ol className="space-y-6">
        {questions.map((q, qi) => {
          const chosen = selected[qi];
          return (
            <li key={q.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="mb-1 text-xs font-semibold text-slate-500">問題 {qi + 1}</p>
              <p className="mb-4 whitespace-pre-line font-serif text-base leading-relaxed text-slate-900">{q.sentence}</p>
              <div className="space-y-2" role="group" aria-label={`問題 ${qi + 1} の選択肢`}>
                {q.choices.map((c) => {
                  const isCorrect = c.label === q.answer;
                  const isChosen = chosen === c.label;
                  let style = "border-slate-200 hover:border-[#8fae4e]";
                  if (chosen !== null) {
                    if (isCorrect) style = "border-[#8fae4e] bg-[#f2f7ea]";
                    else if (isChosen) style = "border-[#c0392b] bg-[#fbeceb]";
                    else style = "border-slate-200 opacity-60";
                  }
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => choose(qi, c.label)}
                      disabled={chosen !== null}
                      aria-pressed={isChosen}
                      className={`w-full rounded border px-4 py-2 text-left text-sm transition-colors ${style}`}
                    >
                      <span className="mr-2 font-mono font-semibold">({c.label})</span>
                      {c.text}
                      {chosen !== null && isCorrect && (
                        <span className="ml-2 text-xs font-semibold text-[#6a8a3e]">✓ 正解</span>
                      )}
                      {isChosen && !isCorrect && (
                        <span className="ml-2 text-xs font-semibold text-[#c0392b]">✕ あなたの選択</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {chosen !== null && (
                <div className="mt-4 rounded-md border border-slate-200 p-4" role="status" aria-live="polite">
                  <p className={`mb-2 text-sm font-semibold ${chosen === q.answer ? "text-[#6a8a3e]" : "text-[#c0392b]"}`}>
                    {chosen === q.answer ? "正解です" : `不正解です(正解: ${q.answer})`}
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    <Inline text={q.explanation} />
                  </p>
                  {q.translation && (
                    <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
                      {q.translation}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {finished && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5" role="status" aria-live="polite">
          <p className="text-base font-semibold text-slate-900">
            結果: {questions.length}問中 {correctCount}問正解
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {correctCount === questions.length
              ? "全問正解です。この章の内容は身についています。"
              : "間違えた問題の解説を読み返して、本文の該当する節をもう一度確かめましょう。"}
          </p>
          <button
            type="button"
            onClick={() => setSelected(questions.map(() => null))}
            className="mt-3 rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            もう一度解く
          </button>
        </div>
      )}
    </div>
  );
}
