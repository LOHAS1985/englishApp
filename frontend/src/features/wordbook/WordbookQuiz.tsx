import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchWordbookChoice,
  fetchWordbookFill,
  setWordbookColor,
  submitWordbookChoice,
  submitWordbookFill,
  type WordbookAnswerResult,
  type WordbookChoiceQuestion,
  type WordbookColor,
  type WordbookFillQuestion,
} from "../../api/client";
import Header from "../../shared/components/Header";
import ColorButtons from "./ColorButtons";
import { pushRecent } from "./wordbookRules";

type Kind = "choice" | "fill";

type Question =
  | { kind: "choice"; data: WordbookChoiceQuestion }
  | { kind: "fill"; data: WordbookFillQuestion };

/** 出題から解答までの秒数(学習時間の記録用) */
const secondsSince = (start: number) => Math.round((Date.now() - start) / 1000);

/** 直近に出した語(exclude)を避けて1問取る */
function fetchQuestion(kind: Kind, exclude: number[]): Promise<Question> {
  return kind === "fill"
    ? fetchWordbookFill(exclude).then((data) => ({ kind, data }))
    : fetchWordbookChoice(exclude).then((data) => ({ kind, data }));
}

/** 単語帳の4択・穴埋め。?type=choice(既定)か ?type=fill。問題と結果だけを出す */
export default function WordbookQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kind: Kind = searchParams.get("type") === "fill" ? "fill" : "choice";

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<WordbookAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [typed, setTyped] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [color, setColor] = useState<WordbookColor>("NONE");
  const shownAtRef = useRef(0);
  /** 直近に出した語。同じ語が続けて出ないよう、サーバーに exclude として渡す */
  const recentRef = useRef<number[]>([]);

  // 画面を開いたとき(形式が変わったとき)に最初の1問を出す
  useEffect(() => {
    let cancelled = false;
    async function start() {
      recentRef.current = [];
      setCount(0);
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const next = await fetchQuestion(kind, []);
        if (cancelled) return;
        recentRef.current = pushRecent(recentRef.current, next.data.wordId);
        shownAtRef.current = Date.now();
        setQuestion(next);
        setCount(1);
      } catch (e) {
        if (cancelled) return;
        setQuestion(null);
        setError(e instanceof Error ? e.message : "出題に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void start();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  const nextQuestion = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setSelected(null);
    setTyped("");
    try {
      const next = await fetchQuestion(kind, recentRef.current);
      recentRef.current = pushRecent(recentRef.current, next.data.wordId);
      shownAtRef.current = Date.now();
      setQuestion(next);
      setCount((c) => c + 1);
    } catch (e) {
      setQuestion(null);
      setError(e instanceof Error ? e.message : "出題に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const finish = (data: WordbookAnswerResult) => {
    setResult(data);
    setColor(data.color);
  };

  const answerChoice = async (meaning: string) => {
    if (!question || question.kind !== "choice" || result || submitting) return;
    setSelected(meaning);
    setSubmitting(true);
    try {
      finish(await submitWordbookChoice(question.data.wordId, meaning, secondsSince(shownAtRef.current)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const answerFill = async (e: FormEvent) => {
    e.preventDefault();
    if (!question || question.kind !== "fill" || result || submitting || typed.trim() === "") return;
    setSubmitting(true);
    try {
      finish(await submitWordbookFill(question.data.wordId, typed, secondsSince(shownAtRef.current)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const changeColor = async (next: WordbookColor) => {
    if (!question) return;
    try {
      await setWordbookColor(question.data.wordId, next);
      setColor(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "色の変更に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[640px] bg-white border border-slate-200 rounded-md p-9">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate("/wordbook")} className="text-sm text-[#2463a8] hover:underline">
              ← 単語帳へ戻る
            </button>
            {count > 0 && <span className="text-sm text-slate-500">{count}問目</span>}
          </div>

          {loading && <p className="text-sm text-slate-400">出題中…</p>}

          {!loading && error && (
            <div>
              <p className="text-sm text-[#c0392b] mb-4">{error}</p>
              <button
                onClick={() => navigate("/wordbook/list")}
                className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
              >
                一覧で単語を確認する
              </button>
            </div>
          )}

          {!loading && !error && question?.kind === "choice" && (
            <div>
              <p className="font-serif text-3xl text-slate-900 mb-6">{question.data.word}</p>
              <div className="space-y-2">
                {question.data.choices.map((choice) => (
                  <button
                    key={choice}
                    disabled={result !== null || submitting}
                    onClick={() => answerChoice(choice)}
                    className={`w-full text-left border rounded px-4 py-3 text-sm transition-colors ${choiceStyle(
                      choice,
                      result,
                      selected,
                    )}`}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && !error && question?.kind === "fill" && (
            <div>
              <p className="font-serif text-lg text-slate-900 leading-8 mb-3">{question.data.sentence}</p>
              <p className="text-sm text-slate-600 mb-6">{question.data.translation}</p>
              {!result && (
                <form onSubmit={answerFill} className="flex gap-3">
                  <input
                    autoFocus
                    aria-label="英単語"
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    disabled={submitting}
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="flex-1 border border-slate-300 rounded px-4 py-3 text-base"
                  />
                  <button
                    type="submit"
                    disabled={submitting || typed.trim() === ""}
                    className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] disabled:opacity-50 transition-colors"
                  >
                    回答
                  </button>
                </form>
              )}
            </div>
          )}

          {!loading && !error && result && (
            <div className="mt-6 text-sm leading-relaxed">
              <p className={`font-semibold ${result.correct ? "text-[#6a8a3e]" : "text-[#c0392b]"}`}>
                {result.correct ? "正解" : "不正解"}
              </p>
              {!result.correct && (
                <p className="text-slate-600 mt-1">
                  正解: <span className="font-semibold text-slate-900">{result.correctAnswer}</span>
                </p>
              )}
              <p className="text-slate-700 mt-3">
                {result.word}
                {result.meaningJa && <span className="text-slate-500 ml-2">{result.meaningJa}</span>}
              </p>
              {result.exampleEn && <p className="text-slate-600 mt-2">{result.exampleEn}</p>}
              {result.exampleJa && <p className="text-slate-500 mt-1">{result.exampleJa}</p>}

              <div className="mt-5">
                <p className="text-xs text-slate-500 mb-2">この単語の色</p>
                <ColorButtons value={color} onChange={changeColor} />
              </div>

              <button
                onClick={nextQuestion}
                className="mt-6 text-sm font-semibold text-white bg-[#8fae4e] rounded px-5 py-3 hover:bg-[#7a9843] transition-colors"
              >
                次の問題
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 4択の選択肢の見た目。解答後は正解を緑、選んだ誤答を赤にする */
function choiceStyle(choice: string, result: WordbookAnswerResult | null, selected: string | null) {
  if (!result) return "border-slate-300 hover:bg-slate-100";
  if (choice === result.correctAnswer) return "border-[#6a8a3e] bg-[#f1f7e8] text-slate-900";
  if (choice === selected) return "border-[#c0392b] bg-[#fbeeee] text-slate-900";
  return "border-slate-200 text-slate-400";
}
