import { useEffect, useState } from "react";
import { fetchStatsSummary, type Skill } from "../api/client";
import { SKILL_COLORS, SKILL_LABELS } from "../shared/exams";
import {
  buildWeeklyReport,
  jstDate,
  loadSavedWeeklyReport,
  saveWeeklyReport,
  type WeeklyAmount,
  type WeeklyReport,
} from "../shared/weeklyReport";

/** 最新の取得状況。保存した内容を先に出すので、取得の途中・失敗でも表示は残る */
type Status = "loading" | "fresh" | "failed";

const SKILLS = Object.keys(SKILL_LABELS) as Skill[];

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/** 時間は分に統一して出す(学習していなければ「-」。1分に満たなければ1分) */
const formatMinutes = (seconds: number) => (seconds > 0 ? `${Math.max(1, Math.round(seconds / 60))}分` : "-");

/** 問題数(題)。学習していなければ「-」 */
const formatCount = (a: WeeklyAmount) => (a.count > 0 ? `${a.count}${a.unit}` : "-");

/**
 * ホーム下部の「今週の学習」。直近7日(今日を含む)に、何をどれだけ学習したかを
 * 技能別(時間・問題数・正答率)、日別(時間)、形式別(表)で出す。
 */
export default function WeeklyStatsSection() {
  const [report, setReport] = useState<WeeklyReport | null>(() => loadSavedWeeklyReport(jstDate()));
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    fetchStatsSummary()
      .then((summary) => {
        const next = buildWeeklyReport(summary);
        saveWeeklyReport(next);
        setReport(next);
        setStatus("fresh");
      })
      .catch(() => setStatus("failed"));
  }, []);

  if (!report) {
    return (
      <p className="mt-8 text-sm text-slate-500">
        {status === "failed" ? "今週の学習を取得できませんでした。" : "今週の学習を読み込んでいます…"}
      </p>
    );
  }

  const maxDaySeconds = Math.max(1, ...report.days.map((d) => d.totalSeconds));

  return (
    <section className="mt-8 rounded-lg bg-white border border-slate-200 shadow-sm p-5" aria-label="今週の学習">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold text-slate-900">今週の学習</h2>
        <span className="text-sm text-slate-600">
          直近7日の合計 <span className="font-semibold">{formatMinutes(report.totalSeconds)}</span>
          {status === "loading" && <span className="ml-2 text-xs text-slate-400">更新中…</span>}
          {status === "failed" && (
            <span className="ml-2 text-xs text-[#c0392b]">最新の状況を取得できませんでした(保存した内容を表示中)</span>
          )}
        </span>
      </div>

      {report.totalSeconds === 0 ? (
        <p className="text-sm text-slate-600">この7日間は、まだ学習の記録がありません。</p>
      ) : (
        <>
          <table aria-label="技能別" className="w-full text-sm mb-6">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-1 pr-2 font-normal">技能</th>
                <th className="py-1 px-2 font-normal text-right">時間</th>
                <th className="py-1 px-2 font-normal text-right">問題数</th>
                <th className="py-1 pl-2 font-normal text-right">正答率</th>
              </tr>
            </thead>
            <tbody>
              {report.skills.map((s) => (
                <tr key={s.skill} className="border-b border-slate-100">
                  <td className="py-2 pr-2 text-slate-900">
                    <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${SKILL_COLORS[s.skill]}`} aria-hidden />
                    {SKILL_LABELS[s.skill]}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-900">{formatMinutes(s.seconds)}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-700">{formatCount(s)}</td>
                  <td className="py-2 pl-2 text-right font-mono text-slate-700">
                    {s.accuracy === null ? "-" : percent(s.accuracy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="text-sm font-semibold text-slate-700 mb-2">日ごとの学習時間(分)</h3>
          <div className="flex items-end gap-2">
            {report.days.map((d) => (
              <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center">
                <span className="h-4 text-xs text-slate-600">{d.totalSeconds > 0 ? Math.round(d.totalSeconds / 60) : ""}</span>
                <div className="h-24 w-full flex flex-col-reverse rounded bg-slate-100 overflow-hidden">
                  {SKILLS.map((skill) => {
                    const seconds = d.seconds[skill] ?? 0;
                    return seconds > 0 ? (
                      <div
                        key={skill}
                        className={SKILL_COLORS[skill]}
                        style={{ height: `${(seconds / maxDaySeconds) * 100}%` }}
                        title={`${SKILL_LABELS[skill]} ${formatMinutes(seconds)}`}
                      />
                    ) : null;
                  })}
                </div>
                <span
                  className={`mt-1 text-center text-xs leading-tight ${d.isToday ? "font-bold text-slate-900" : "text-slate-500"}`}
                >
                  {d.label}
                  <span className="block">({d.weekday})</span>
                </span>
              </div>
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {SKILLS.map((skill) => (
              <li key={skill} className="flex items-center gap-1">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${SKILL_COLORS[skill]}`} aria-hidden />
                {SKILL_LABELS[skill]}
              </li>
            ))}
          </ul>

          {report.types.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">形式別の内訳</summary>
              <div className="mt-2 overflow-x-auto">
                <table aria-label="形式別" className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-1 pr-2 font-normal">形式</th>
                      <th className="py-1 px-2 font-normal text-right">時間</th>
                      <th className="py-1 px-2 font-normal text-right">問題数</th>
                      <th className="py-1 pl-2 font-normal text-right">正答率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.types.map((t) => (
                      <tr key={t.type} className="border-b border-slate-100">
                        <td className="py-1.5 pr-2 text-slate-900">
                          <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${SKILL_COLORS[t.skill]}`} aria-hidden />
                          {t.label}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">{formatMinutes(t.seconds)}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">{formatCount(t)}</td>
                        <td className="py-1.5 pl-2 text-right font-mono text-slate-700">
                          {t.accuracy === null ? "-" : percent(t.accuracy)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
