import { useEffect, useState } from "react";
import { fetchSpeakingHistory, type SpeakingHistoryItem, type SpeakingScoreResult } from "../api/client";

const MAX_SCORE = 16;
/** 推移の棒に出す件数(新しい順に届いた先頭から) */
const TREND_SHOWN = 10;

const CRITERIA: { key: keyof Pick<SpeakingScoreResult, "content" | "structure" | "vocabulary" | "grammar">; label: string }[] = [
  { key: "content", label: "内容" },
  { key: "structure", label: "構成" },
  { key: "vocabulary", label: "語彙" },
  { key: "grammar", label: "文法" },
];

const partLabel = (part: number) => (part === 1 ? "No.1 ナレーション" : `No.${part} Q&A`);

/** スピーキングの AI 採点の履歴。点数の推移と、パートごとの採点結果・文字起こしを見返す */
export default function SpeakingHistorySection() {
  const [items, setItems] = useState<SpeakingHistoryItem[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetchSpeakingHistory()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!items) return null;

  // 新しい順で届くので、古い順に並べ直して推移を左から右へ読めるようにする
  const trend = items.slice(0, TREND_SHOWN).reverse();

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-1">スピーキング採点履歴</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">まだ採点していません。</p>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-md p-5 mb-3">
            <div className="flex items-end gap-2 h-24" role="img" aria-label="直近の採点の点数の推移">
              {trend.map((item) => (
                <div key={item.id} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="font-mono text-[0.625rem] text-slate-500 mb-1">{item.result.total}</span>
                  <div
                    className="w-full bg-[#8fae4e] rounded-t"
                    style={{ height: `${(item.result.total / MAX_SCORE) * 100}%`, minHeight: "0.125rem" }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">直近 {trend.length} 件(左が古い)</p>
          </div>

          <ul className="space-y-3">
            {items.map((item) => {
              const open = openId === item.id;
              return (
                <li key={item.id} className="bg-white border border-slate-200 rounded-md">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : item.id)}
                    aria-expanded={open}
                    className="w-full text-left p-4 flex items-center justify-between gap-3"
                  >
                    <span>
                      <span className="block font-mono text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleString("ja-JP")}
                      </span>
                      <span className="block text-sm text-slate-900">
                        {item.title} / {partLabel(item.part)}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-900 shrink-0">
                      {item.result.total} / {MAX_SCORE}
                    </span>
                  </button>

                  {open && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 mb-1">文字起こし</p>
                        <p className="text-sm text-slate-700 font-serif whitespace-pre-wrap leading-relaxed">
                          {item.transcript}
                        </p>
                      </div>
                      {CRITERIA.map(({ key, label }) => (
                        <div key={key}>
                          <p className="text-sm font-semibold text-slate-900">
                            {label}{" "}
                            <span className="font-mono font-normal text-slate-500">{item.result[key].score} / 4</span>
                          </p>
                          <p className="text-sm text-slate-600 leading-relaxed">{item.result[key].feedback}</p>
                        </div>
                      ))}
                      {item.result.betterAnswer && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 mb-1">あなたの答えを直した例</p>
                          <p className="text-sm text-slate-700 font-serif bg-slate-50 rounded p-3 leading-relaxed">
                            {item.result.betterAnswer}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
