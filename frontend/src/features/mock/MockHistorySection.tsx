import { useEffect, useState } from "react";
import { fetchMockHistory, type MockHistoryItem } from "../../api/client";
import { TOEIC_TARGET } from "./mockTargets";

/** 推定点の上限(L 495 + R 495)。推移の棒の高さに使う */
const MAX_TOTAL = 990;
const SHOWN = 10;

/** 模試の推定点の推移(参考値)。目標 930 点との差を見る */
export default function MockHistorySection() {
  const [items, setItems] = useState<MockHistoryItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMockHistory()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!items) return null;

  // 新しい順で届くので、古い順に並べ直して推移を左から右へ読めるようにする
  const recent = items.slice(0, SHOWN).reverse();

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-1">模試の推定点(参考値)</h2>
      <p className="text-xs text-slate-500 mb-3">
        正答率から決めた仮の換算による推定点です。目標は {TOEIC_TARGET.total} 点(L {TOEIC_TARGET.listening} / R{" "}
        {TOEIC_TARGET.reading})です。
      </p>
      {recent.length === 0 ? (
        <p className="text-sm text-slate-500">
          まだ模試を受けていません。ホームから TOEIC の「模試」で始められます。
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <div className="flex items-end gap-2 h-32 mb-2">
            {recent.map((m) => (
              <div key={m.id} className="flex-1 flex flex-col items-center justify-end h-full" title={`${m.estimatedTotal} 点`}>
                <span className="font-mono text-[10px] text-slate-500 mb-1">{m.estimatedTotal}</span>
                <div
                  className={`w-full rounded-t ${m.estimatedTotal >= TOEIC_TARGET.total ? "bg-[#8fae4e]" : "bg-[#2463a8]"}`}
                  style={{ height: `${Math.max(4, (m.estimatedTotal / MAX_TOTAL) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mb-4">
            <span>古い</span>
            <span>目標 {TOEIC_TARGET.total} 点(緑の棒は目標以上)</span>
            <span>新しい</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left font-normal py-1">日時</th>
                <th className="text-right font-normal py-1">L 推定</th>
                <th className="text-right font-normal py-1">R 推定</th>
                <th className="text-right font-normal py-1">合計</th>
              </tr>
            </thead>
            <tbody>
              {[...recent].reverse().map((m) => (
                <tr key={m.id} className="border-b border-slate-100">
                  <td className="py-1 font-mono text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleString("ja-JP", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="py-1 font-mono text-right">
                    {m.listeningScore}
                    <span className="text-xs text-slate-400"> ({m.listeningCorrect}/{m.listeningTotal})</span>
                  </td>
                  <td className="py-1 font-mono text-right">
                    {m.readingScore}
                    <span className="text-xs text-slate-400"> ({m.readingCorrect}/{m.readingTotal})</span>
                  </td>
                  <td className="py-1 font-mono text-right font-semibold">{m.estimatedTotal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
