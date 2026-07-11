import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchGrammarQuestion,
  submitGrammarAnswer,
  type GrammarQuestion,
  type GrammarAnswerResult,
} from "../api/client";
import { useAuth } from "../context/useAuth";
import Header from "../components/Header";

export default function Grammar() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState<GrammarQuestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarAnswerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    setResult(null);
    setSelected(null);
    try {
      const data = await fetchGrammarQuestion();
      setQuestion(data);
    } catch {
      alert("出題に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (label: string) => {
    if (!question || result) return;
    if (!token) {
      navigate("/login");
      return;
    }
    setSelected(label);
    setSubmitting(true);
    try {
      const data = await submitGrammarAnswer(question.id, label, token);
      setResult(data);
    } catch {
      alert("採点に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[640px] bg-white border border-slate-200 rounded-md p-9">
          <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
            TOEIC GRAMMAR
          </p>
          <h1 className="font-serif text-2xl text-slate-900 mb-6">文法問題</h1>

          <button
            onClick={handleFetch}
            disabled={loading}
            className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                       hover:bg-[#23365c] disabled:bg-slate-400 transition-colors"
          >
            {loading ? "出題中…" : "問題を出題する"}
          </button>

          {question && (
            <div className="mt-8">
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

                  <button
                    onClick={handleFetch}
                    className="mt-5 text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                               hover:bg-[#23365c] transition-colors"
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
