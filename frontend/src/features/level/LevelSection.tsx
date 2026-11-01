import { useEffect, useState } from "react";
import { fetchLevel, type LevelSummary } from "../../api/client";
import { levelProgress } from "./levelProgress";

const PACE_LABELS: Record<LevelSummary["pace"], { text: string; style: string }> = {
  ahead: { text: "予定より進んでいます", style: "text-[#6a8a3e]" },
  onTrack: { text: "ほぼ予定どおりです", style: "text-slate-700" },
  behind: { text: "予定より遅れています", style: "text-[#c0392b]" },
};

/** マイページのレベル欄:現在のレベル、今日の経験値、期限(3月末に Lv.100)までのペース */
export default function LevelSection() {
  const [level, setLevel] = useState<LevelSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLevel()
      .then(setLevel)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!level) return null;

  const pace = PACE_LABELS[level.pace];
  const todayRate = Math.min(1, level.today.total / level.dailyTargetXp);
  const maxDay = Math.max(level.dailyTargetXp, ...level.recentDays.map((d) => d.xp));
  const behindXp = level.expectedXp - level.totalXp;

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-3">レベル</h2>
      <div className="bg-white border border-slate-200 rounded-md p-5 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-4xl font-semibold text-slate-900">
              Lv.{level.level}
              <span className="text-base text-slate-400"> / {level.maxLevel}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              累計 {level.totalXp.toLocaleString()} XP
              {level.nextLevelXp !== null &&
                `・次のレベルまで ${(level.nextLevelXp - level.totalXp).toLocaleString()} XP`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">連続学習(10分以上の日)</p>
            <p className="font-mono text-2xl font-semibold">{level.streakDays} 日</p>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded">
          <div className="h-2 bg-[#8fae4e] rounded" style={{ width: `${levelProgress(level) * 100}%` }} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>今日の経験値</span>
            <span className="font-mono">
              {level.today.total} / {level.dailyTargetXp} XP
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded">
            <div className="h-1.5 bg-[#2463a8] rounded" style={{ width: `${todayRate * 100}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            解答 {level.today.answers} + 時間 {level.today.time} + ボーナス {level.today.bonus}
            {level.today.multiplier > 1 && ` × 連続 ${level.today.multiplier.toFixed(2)}`}
            (1日の目安 {level.dailyTargetXp} XP ≒ 30分)
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className={`text-sm font-semibold ${pace.style}`}>{pace.text}</p>
          <p className="text-sm text-slate-600 mt-1">
            予定では今日の時点で Lv.{level.expectedLevel}(現在 Lv.{level.level})。
            {behindXp > 0 && `予定まであと ${behindXp.toLocaleString()} XP です。`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {level.goalDate.replace(/-/g, "/")} に Lv.{level.maxLevel} にするには、残り {level.daysLeft} 日で
            1日あたり約 {level.xpPerDayToGoal.toLocaleString()} XP が必要です。
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">日別の経験値(14日・点線は1日の目安)</p>
          <div className="relative flex items-end gap-1 h-20">
            <div
              className="absolute left-0 right-0 border-t border-dashed border-slate-300"
              style={{ bottom: `${(level.dailyTargetXp / maxDay) * 100}%` }}
            />
            {level.recentDays.map((d) => (
              <div
                key={d.date}
                className={`flex-1 rounded-t ${d.xp >= level.dailyTargetXp ? "bg-[#8fae4e]" : "bg-slate-300"}`}
                style={{ height: `${(d.xp / maxDay) * 100}%` }}
                title={`${d.date}: ${d.xp} XP`}
              />
            ))}
          </div>
        </div>

        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer text-slate-500">経験値のルール</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>正解:1問にかかる時間に比例(語彙・Part 5 は8、Part 7 は18、英検 大問3 は26 など)。発展は1.3倍、基礎は0.8倍</li>
            <li>不正解でも基本の3割。前に間違えた問題に後日全問正解すると1.5倍</li>
            <li>ライティングは得点×15(要約は×9)、面接練習は1セット150</li>
            <li>同じ問題を同じ日に解き直した分は入りません</li>
            <li>学習時間1分ごとに1(1日60まで)、30分達成で+50、取り組んだ技能1つごとに+10</li>
            <li>10分以上学習した日が続くと、1日ごとに2%ずつ増えて最大1.3倍</li>
          </ul>
        </details>
      </div>
    </section>
  );
}
