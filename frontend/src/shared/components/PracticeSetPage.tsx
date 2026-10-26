import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPracticeSet,
  fetchPracticeTypes,
  submitPracticeAnswers,
  type QuestionSetView,
  type SetAnswerResult,
} from "../../api/client";
import { useAuth } from "../context/useAuth";
import Header from "./Header";

const LETTERS = ["A", "B", "C", "D"];

interface PracticeSetPageProps {
  feature: "reading" | "listening";
  eyebrow: string;
  title: string;
  /** 形式(type)の表示名。並び順もこの順になる */
  typeLabels: Record<string, string>;
  /** 出題の取得からログインが必要か(リスニングは音声生成にサーバー負荷がかかるため必要) */
  requireLogin?: boolean;
  /** 設問の上に表示する教材(読解の本文、リスニングの再生ボタンなど) */
  renderMaterial: (set: QuestionSetView, result: SetAnswerResult | null) => ReactNode;
}

/** 文章または音声1つに複数の設問が付くセット問題(読解・リスニング)の共通画面 */
export default function PracticeSetPage({
  feature,
  eyebrow,
  title,
  typeLabels,
  requireLogin = false,
  renderMaterial,
}: PracticeSetPageProps) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [type, setType] = useState(Object.keys(typeLabels)[0]);
  const [set, setSet] = useState<QuestionSetView | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<SetAnswerResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const showSet = (data: QuestionSetView | null) => {
    setSet(data);
    setAnswers(data ? data.questions.map(() => "") : []);
    setResult(null);
    setError(data ? "" : "問題の取得に失敗しました。この形式の問題がまだ無い可能性があります。");
    setLoading(false);
  };

  // 「次の問題」用。同じセットが続けて出ないよう、同じ ID なら1回だけ取り直す
  const loadNext = async () => {
    setLoading(true);
    try {
      let data = await fetchPracticeSet(feature, type, token);
      if (set && data.id === set.id && (counts[type] ?? 0) > 1) {
        data = await fetchPracticeSet(feature, type, token);
      }
      showSet(data);
    } catch {
      showSet(null);
    }
  };

  useEffect(() => {
    if (requireLogin && !token) {
      navigate("/login");
      return;
    }
    fetchPracticeTypes(feature, token)
      .then(setCounts)
      .catch(() => setCounts({}));
  }, [feature, requireLogin, token, navigate]);

  useEffect(() => {
    if (requireLogin && !token) return;
    let cancelled = false;
    fetchPracticeSet(feature, type, token)
      .then((data) => !cancelled && showSet(data))
      .catch(() => !cancelled && showSet(null));
    return () => {
      cancelled = true;
    };
  }, [feature, type, requireLogin, token]);

  const handleSubmit = async () => {
    if (!set) return;
    if (!token) {
      navigate("/login");
      return;
    }
    setSubmitting(true);
    try {
      setResult(await submitPracticeAnswers(feature, set.id, answers, token));
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
          <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
            {eyebrow}
          </p>
          <h1 className="font-serif text-2xl text-slate-900 mb-4">{title}</h1>

          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(typeLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  if (key === type) return;
                  setLoading(true);
                  setType(key);
                }}
                className={`text-xs sm:text-sm rounded-full border px-3 py-1.5 transition-colors ${
                  type === key
                    ? "bg-[#16233d] border-[#16233d] text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:border-[#16233d]"
                }`}
              >
                {label}
                <span className="ml-1 opacity-60">({counts[key] ?? 0})</span>
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-slate-400">出題中…</p>}
          {error && <p className="text-sm text-[#c0392b]">{error}</p>}

          {!loading && set && (
            <div>
              <h2 className="font-serif text-lg text-slate-900 mb-3">{set.title}</h2>
              {set.situation && (
                <p className="text-sm text-slate-700 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                  <span className="font-semibold">Situation: </span>
                  {set.situation}
                </p>
              )}

              {renderMaterial(set, result)}

              <div className="space-y-5 mt-6">
                {set.questions.map((q, qi) => {
                  const r = result?.results[qi];
                  return (
                    <div key={qi} className="border border-slate-200 rounded-md p-4">
                      <p className="text-sm font-semibold text-slate-900 mb-3">
                        Q{qi + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.choices.map((choice, ci) => {
                          const letter = LETTERS[ci];
                          const isSelected = answers[qi] === letter;
                          let style = isSelected
                            ? "border-[#8fae4e] bg-[#f2f7ea]"
                            : "border-slate-200 hover:border-[#8fae4e]";
                          if (r) {
                            if (letter === r.answer) style = "border-[#8fae4e] bg-[#f2f7ea]";
                            else if (isSelected) style = "border-[#c0392b] bg-[#fbeceb]";
                            else style = "border-slate-200 opacity-60";
                          }
                          return (
                            <button
                              key={letter}
                              disabled={!!result}
                              onClick={() =>
                                setAnswers((prev) => prev.map((a, i) => (i === qi ? letter : a)))
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
                            {r.correct ? "正解" : `不正解(正解: ${r.answer})`}
                          </p>
                          <p className="text-slate-600 mt-1">{r.explanation}</p>
                        </div>
                      )}
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
                  {result.script && (
                    <details className="mb-3 border border-slate-200 rounded-md p-4" open>
                      <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                        スクリプト
                      </summary>
                      <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {result.script}
                      </p>
                    </details>
                  )}
                  {result.translation && (
                    <details className="mb-4 border border-slate-200 rounded-md p-4">
                      <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
                        和訳
                      </summary>
                      <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {result.translation}
                      </p>
                    </details>
                  )}
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
