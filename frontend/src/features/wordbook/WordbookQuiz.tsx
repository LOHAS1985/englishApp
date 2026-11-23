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
import { useQuizKeys, type QuizKeyActions } from "../../shared/quizKeys";
import AnswerResultPanel from "./AnswerResultPanel";
import PronounceButton from "./PronounceButton";
import { pushRecent } from "./wordbookRules";
import { messageOf } from "../../shared/errorMessage";

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
  /** 解答・色の変更に失敗したときの文言。問題は消さずに、問題の下に出す */
  const [actionError, setActionError] = useState("");
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<WordbookAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [typed, setTyped] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  /** 答えずに「答えを見る」を押した(結果を「不正解」ではなく「答え」と出す) */
  const [revealed, setRevealed] = useState(false);
  const [color, setColor] = useState<WordbookColor>("NONE");
  const shownAtRef = useRef(0);
  /** 直近に出した語。同じ語が続けて出ないよう、サーバーに exclude として渡す */
  const recentRef = useRef<number[]>([]);

  /**
   * 次の問題の先読み。問題を出した時点で取りに行き、「次の問題」を押したら待たずに出す
   * (1問ごとにサーバーの応答を待っていたため)。形式が変わったら使わない
   */
  const prefetchRef = useRef<{ kind: Kind; promise: Promise<Question | null> } | null>(null);

  /** 問題を出し、その次の問題を先読みする */
  const show = (next: Question) => {
    recentRef.current = pushRecent(recentRef.current, next.data.wordId);
    shownAtRef.current = Date.now();
    setQuestion(next);
    setCount((c) => c + 1);
    // 表示中の語は recentRef に入っているので、先読みで同じ語は選ばれない
    prefetchRef.current = { kind: next.kind, promise: fetchQuestion(next.kind, recentRef.current).catch(() => null) };
  };

  // 画面を開いたとき(形式が変わったとき)に最初の1問を出す
  useEffect(() => {
    let cancelled = false;
    async function start() {
      recentRef.current = [];
      prefetchRef.current = null;
      setCount(0);
      setLoading(true);
      setError("");
      setResult(null);
      try {
        const next = await fetchQuestion(kind, []);
        if (cancelled) return;
        show(next);
      } catch (e) {
        if (cancelled) return;
        setQuestion(null);
        setError(messageOf(e, "出題に失敗しました"));
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
    setError("");
    setActionError("");
    setResult(null);
    setSelected(null);
    setTyped("");
    setRevealed(false);
    const prefetched = prefetchRef.current?.kind === kind ? prefetchRef.current.promise : null;
    prefetchRef.current = null;
    setLoading(true);
    try {
      // 先読みが失敗していたら(null)、その場で取り直す
      show((prefetched ? await prefetched : null) ?? (await fetchQuestion(kind, recentRef.current)));
    } catch (e) {
      setQuestion(null);
      setError(messageOf(e, "出題に失敗しました"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * 解答を送って結果を出す。4択・穴埋め・「答えを見る」で共通。
   * 答えを見るときは空の答えを送る(サーバーで必ず不正解になり、分からなかった語として翌日の復習に回る)。
   * 失敗しても問題は消さず、問題の下にエラーを出して、もう一度答えられるようにする
   */
  const submit = async (answer: string, options: { reveal?: boolean } = {}) => {
    if (!question || result || submitting) return;
    if (question.kind === "choice" && !options.reveal) setSelected(answer);
    setSubmitting(true);
    setActionError("");
    try {
      const seconds = secondsSince(shownAtRef.current);
      const data =
        question.kind === "fill"
          ? await submitWordbookFill(question.data.wordId, answer, seconds)
          : await submitWordbookChoice(question.data.wordId, answer, seconds);
      setRevealed(options.reveal === true);
      setResult(data);
      setColor(data.color);
    } catch (e) {
      // 4択は選び直せるよう選択を外す。穴埋めは入力した答えを残す
      setSelected(null);
      setActionError(messageOf(e, "採点に失敗しました"));
    } finally {
      setSubmitting(false);
    }
  };

  const answerChoice = (meaning: string) => submit(meaning);

  const answerFill = (e: FormEvent) => {
    e.preventDefault();
    if (typed.trim() === "") return;
    void submit(typed);
  };

  const reveal = () => submit("", { reveal: true });

  const revealButton = !result && (
    <button
      type="button"
      onClick={reveal}
      disabled={submitting}
      className="text-sm text-slate-600 border border-slate-300 rounded px-4 py-3 hover:bg-slate-100 disabled:opacity-50 transition-colors"
    >
      答えを見る
    </button>
  );

  // 解答したら「次の問題」にフォーカスを移す(Enter で続けられる)
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (result) nextButtonRef.current?.focus();
  }, [result]);

  // キーボード: 4択は 1〜4 / A〜D で選択(穴埋めは入力欄があるので使わない)
  const keyActions = useRef<QuizKeyActions>({});
  useEffect(() => {
    keyActions.current = {
      onChoice: (index) => {
        if (question?.kind !== "choice" || result) return;
        const choice = question.data.choices[index];
        if (choice !== undefined) void answerChoice(choice);
      },
      onEnter: () => {
        if (result) void nextQuestion();
      },
    };
  });
  useQuizKeys(!loading && !error && question !== null && !submitting, keyActions);

  const changeColor = async (next: WordbookColor) => {
    if (!question) return;
    try {
      await setWordbookColor(question.data.wordId, next);
      setColor(next);
    } catch (e) {
      setActionError(messageOf(e, "色の変更に失敗しました"));
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[40rem] question-card bg-white border border-slate-200 rounded-md p-9">
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
              <div className="flex items-center gap-3 mb-6">
                <p className="font-serif text-3xl text-slate-900">{question.data.word}</p>
                {/* 4択は英単語を見せる問題なので、解答前から読み方を聞ける(穴埋めは答えが分かるので解答後だけ) */}
                <PronounceButton word={question.data.word} />
              </div>
              <div className="space-y-2">
                {question.data.choices.map((choice) => (
                  <button
                    key={choice}
                    disabled={result !== null || submitting}
                    aria-pressed={selected === choice}
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
              {revealButton && <div className="mt-3">{revealButton}</div>}
              <ActionError message={actionError} />
            </div>
          )}

          {!loading && !error && question?.kind === "fill" && (
            <div>
              <p className="font-serif text-lg text-slate-900 leading-8 mb-3">{question.data.sentence}</p>
              <p className="text-sm text-slate-600 mb-3">{question.data.translation}</p>
              <p className="text-sm text-slate-500 mb-6">
                ヒント: <span className="font-mono">{question.data.hint}</span>
              </p>
              {!result && (
                <form onSubmit={answerFill} className="flex flex-wrap gap-3">
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
                  {revealButton}
                </form>
              )}
              <ActionError message={actionError} />
            </div>
          )}

          {!loading && !error && result && (
            <AnswerResultPanel
              result={result}
              revealed={revealed}
              color={color}
              onColorChange={changeColor}
              onNext={nextQuestion}
              nextButtonRef={nextButtonRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** 解答・色の変更に失敗したときの文言(問題は消さずに、問題の下に出す) */
function ActionError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-4 text-sm text-[#c0392b]">
      {message}
    </p>
  );
}

/** 4択の選択肢の見た目。解答後は正解を緑、選んだ誤答を赤にする */
function choiceStyle(choice: string, result: WordbookAnswerResult | null, selected: string | null) {
  if (!result) return "border-slate-300 hover:bg-slate-100";
  if (choice === result.correctAnswer) return "border-[#6a8a3e] bg-[#f1f7e8] text-slate-900";
  if (choice === selected) return "border-[#c0392b] bg-[#fbeeee] text-slate-900";
  return "border-slate-200 text-slate-400";
}
