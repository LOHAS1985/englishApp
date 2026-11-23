import { useEffect, useState } from "react";
import { DIFFICULTY_TARGET_PERCENT, fetchDifficultyStats, type DifficultyStat } from "../api/client";

const LABELS: Record<DifficultyStat["feature"], string> = {
  grammar: "文法(Part 5)",
  vocab: "語彙",
  reading: "読解",
  listening: "リスニング",
};

/** 正答率(%)。解いていなければ null */
const rateOf = (s: DifficultyStat) => (s.answered === 0 ? null : Math.round((s.correct / s.answered) * 100));

/** 難易度4(難関)の正答率と、目標(85%)までの差。難易度4は問題集の中で一部の形式にしかないので、ない形式はそう書く */
export default function DifficultySection() {
  const [stats, setStats] = useState<DifficultyStat[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDifficultyStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!stats) return null;

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-1">難易度4(難関)の正答率</h2>
      <p className="text-xs text-slate-500 mb-3">目標 {DIFFICULTY_TARGET_PERCENT}%</p>
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="text-left font-normal px-4 py-2">形式</th>
              <th className="text-right font-normal px-4 py-2">難易度4の問題</th>
              <th className="text-right font-normal px-4 py-2">解いた設問</th>
              <th className="text-right font-normal px-4 py-2">正答率</th>
              <th className="text-right font-normal px-4 py-2">目標まで</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => {
              const rate = rateOf(s);
              return (
                <tr key={s.feature} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-semibold">{LABELS[s.feature]}</td>
                  <td className="px-4 py-2 text-right font-mono">{s.available}</td>
                  <td className="px-4 py-2 text-right font-mono">{s.answered}</td>
                  <td className="px-4 py-2 text-right font-mono">{rate === null ? "—" : `${rate}%`}</td>
                  <td className="px-4 py-2 text-right">
                    {s.available === 0
                      ? <span className="text-slate-400">練習できません</span>
                      : rate === null
                        ? <span className="text-slate-400">まだ解いていません</span>
                        : rate >= DIFFICULTY_TARGET_PERCENT
                          ? <span className="text-[#6a8a3e] font-semibold">到達</span>
                          : <span>あと {DIFFICULTY_TARGET_PERCENT - rate} 点</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
