import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchWordbookStats, type WordbookStats } from "../api/client";

const percent = (correct: number, asked: number) => (asked === 0 ? null : Math.round((correct / asked) * 100));

/** MyPage の単語帳の欄。習熟度の分布・直近7日の正答率・苦手な語を出す */
export default function WordbookStatsSection() {
  const [stats, setStats] = useState<WordbookStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWordbookStats()
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!stats) return null;

  const recentRate = percent(stats.recentCorrect, stats.recentAsked);
  // 棒の幅は、出題できる語に対する割合
  const share = (n: number) => (stats.total === 0 ? 0 : (n / stats.total) * 100);

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-serif text-xl text-slate-900">単語帳</h2>
        <Link to="/wordbook" className="text-sm text-[#2463a8] hover:underline">
          単語帳を開く →
        </Link>
      </div>
      <p className="text-xs text-slate-500 mb-3">出題できる語 {stats.total} 語</p>

      <div className="bg-white border border-slate-200 rounded-md p-5 mb-3">
        <div className="flex h-3 rounded overflow-hidden bg-slate-100" role="img" aria-label="習熟度の分布">
          <div className="bg-[#5b9a3c]" style={{ width: `${share(stats.mastered)}%` }} />
          <div className="bg-[#e6b800]" style={{ width: `${share(stats.learning)}%` }} />
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-slate-500">未学習</dt>
            <dd className="font-mono text-lg">{stats.unseen}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">学習中</dt>
            <dd className="font-mono text-lg">{stats.learning}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">定着</dt>
            <dd className="font-mono text-lg">{stats.mastered}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-slate-700">
          直近7日: {stats.recentAsked}問
          {recentRate !== null && (
            <>
              ・正答率 <span className="font-semibold">{recentRate}%</span>({stats.recentCorrect}/{stats.recentAsked})
            </>
          )}
          {recentRate === null && <span className="text-slate-500">(まだ解いていません)</span>}
        </p>
      </div>

      <h3 className="text-sm font-semibold text-slate-700 mb-2">苦手な語</h3>
      {stats.weakest.length === 0 ? (
        <p className="text-sm text-slate-500">2回以上出して間違えた語はまだありません。</p>
      ) : (
        <ul className="space-y-1">
          {stats.weakest.map((w) => (
            <li key={w.id} className="flex items-baseline gap-3 text-sm bg-white border border-slate-200 rounded px-3 py-2">
              <span className="font-semibold">{w.word}</span>
              <span className="flex-1 text-slate-600 truncate">{w.meaningJa}</span>
              <span className="font-mono text-xs text-slate-500">
                {w.timesCorrect}/{w.timesAsked}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
