import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchStatsSummary,
  fetchStudyHistory,
  type Skill,
  type StatsSummary,
  type StudyLogItem,
  type StudyTotals,
} from "../api/client";
import { SKILL_COLORS, SKILL_LABELS, TYPE_LABELS } from "../shared/exams";

const minutes = (seconds: number) => Math.round(seconds / 60);

const accuracy = (t: StudyTotals) => (t.total === 0 ? null : Math.round((t.correct / t.total) * 100));

/** 弱点として出すのは、ある程度解いた形式だけ(1〜2問の結果で決めつけない) */
const MIN_QUESTIONS_FOR_WEAKNESS = 5;

/** 学習ログの集計(技能別の時間・正答率、日別の学習時間、苦手な形式、最近の履歴) */
export default function StudyStatsSection() {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [history, setHistory] = useState<StudyLogItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStatsSummary()
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
    fetchStudyHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!summary) return <p className="text-sm text-slate-400 mb-8">学習記録を読み込み中…</p>;

  const dayTotal = (d: StatsSummary["daily"][number]) =>
    Object.values(d.seconds).reduce((a, b) => a + b, 0);
  const maxDaily = Math.max(1, ...summary.daily.map(dayTotal));
  const weakTypes = summary.types
    .filter((t) => t.month.total >= MIN_QUESTIONS_FOR_WEAKNESS)
    .map((t) => ({ type: t.type, rate: accuracy(t.month) ?? 0, total: t.month.total }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);
  const reviewDue = Object.values(summary.review).reduce((a, r) => a + r.due, 0);

  return (
    <>
      <section className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <p className="text-xs text-slate-500">今日の学習</p>
          <p className="font-mono text-2xl font-semibold">
            {minutes(summary.today.seconds)}
            <span className="text-sm text-slate-500"> 分 / 30分</span>
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <p className="text-xs text-slate-500">今日解いた数</p>
          <p className="font-mono text-2xl font-semibold">{summary.today.sessions}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-md p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500">今日の復習</p>
          <p className="font-mono text-2xl font-semibold">{reviewDue} 問</p>
          <p className="text-xs text-slate-500 mt-1 space-x-3">
            <Link to="/vocab?review=1" className="text-[#2463a8] hover:underline">
              語彙 {summary.review.vocab?.due ?? 0}
            </Link>
            <Link to="/grammar?review=1" className="text-[#2463a8] hover:underline">
              文法 {summary.review.grammar?.due ?? 0}
            </Link>
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl text-slate-900 mb-3">技能別(直近7日 / 30日)</h2>
        <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 bg-slate-50">
              <tr>
                <th className="text-left font-normal px-3 py-2">技能</th>
                <th className="text-right font-normal px-3 py-2">7日 時間</th>
                <th className="text-right font-normal px-3 py-2">7日 回数</th>
                <th className="text-right font-normal px-3 py-2">30日 時間</th>
                <th className="text-right font-normal px-3 py-2">30日 正答率</th>
              </tr>
            </thead>
            <tbody>
              {summary.skills.map((s) => {
                const rate = accuracy(s.month);
                return (
                  <tr key={s.skill} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm mr-2 ${SKILL_COLORS[s.skill]}`} />
                      {SKILL_LABELS[s.skill]}
                    </td>
                    <td className="text-right font-mono px-3 py-2">{minutes(s.week.seconds)}分</td>
                    <td className="text-right font-mono px-3 py-2">{s.week.sessions}</td>
                    <td className="text-right font-mono px-3 py-2">{minutes(s.month.seconds)}分</td>
                    <td className="text-right font-mono px-3 py-2">{rate === null ? "—" : `${rate}%`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          リーディングには文法(TOEIC Part 5)を含みます。ライティングの得点は正答率に含めません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl text-slate-900 mb-3">日別の学習時間(14日)</h2>
        <div className="bg-white border border-slate-200 rounded-md p-4">
          <div className="flex items-end gap-1 h-32">
            {summary.daily.map((d) => (
              <div
                key={d.date}
                className="flex-1 flex flex-col-reverse h-full"
                title={`${d.date}: ${minutes(dayTotal(d))}分`}
              >
                {(Object.keys(d.seconds) as Skill[]).map((skill) =>
                  d.seconds[skill] > 0 ? (
                    <div
                      key={skill}
                      className={SKILL_COLORS[skill]}
                      style={{ height: `${(d.seconds[skill] / maxDaily) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1 mt-1">
            {summary.daily.map((d) => (
              <span key={d.date} className="flex-1 text-center text-[10px] text-slate-400">
                {Number(d.date.slice(8))}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
            {(Object.keys(SKILL_LABELS) as Skill[]).map((skill) => (
              <span key={skill}>
                <span className={`inline-block w-2.5 h-2.5 rounded-sm mr-1 ${SKILL_COLORS[skill]}`} />
                {SKILL_LABELS[skill]}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl text-slate-900 mb-3">正答率が低い形式(30日)</h2>
        {weakTypes.length === 0 ? (
          <p className="text-sm text-slate-500">
            形式ごとに{MIN_QUESTIONS_FOR_WEAKNESS}問以上解くと表示されます。
          </p>
        ) : (
          <div className="space-y-2">
            {weakTypes.map((t) => (
              <div key={t.type} className="bg-white border border-slate-200 rounded-md px-4 py-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>{TYPE_LABELS[t.type] ?? t.type}</span>
                  <span className="font-mono">
                    {t.rate}%<span className="text-slate-400">({t.total}問)</span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded">
                  <div className="h-1.5 bg-[#c0392b] rounded" style={{ width: `${t.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-serif text-xl text-slate-900 mb-3">最近の学習</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">まだ記録がありません。</p>
        ) : (
          <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2 text-sm gap-3">
                <span className="font-mono text-xs text-slate-400 shrink-0">
                  {new Date(h.createdAt).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="flex-1 truncate">{TYPE_LABELS[h.type] ?? h.type}</span>
                <span className="font-mono text-xs text-slate-500 shrink-0">
                  {h.correct !== null && h.total !== null ? `${h.correct}/${h.total}・` : ""}
                  {Math.max(1, minutes(h.durationSeconds))}分
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
