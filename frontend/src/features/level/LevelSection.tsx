import { useEffect, useState } from "react";
import { fetchLevel, type LevelSummary } from "../../api/client";
import { levelProgress } from "./levelProgress";

/** マイページのレベル欄:現在のレベル、今日の経験値、直近の経験値 */
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

  const maxDay = Math.max(1, ...level.recentDays.map((d) => d.xp));

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-3">レベル</h2>
      <div className="bg-white border border-slate-200 rounded-md p-5 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-4xl font-semibold text-slate-900">
              Lv.{level.level}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              累計 {level.totalXp.toLocaleString()} XP
              {level.nextLevelXp !== null &&
                `・次のレベルまで ${(level.nextLevelXp - level.totalXp).toLocaleString()} XP`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">連続学習</p>
            <p className="font-mono text-2xl font-semibold">{level.streakDays} 日</p>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded">
          <div className="h-2 bg-[#8fae4e] rounded" style={{ width: `${levelProgress(level) * 100}%` }} />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>今日の経験値</span>
            <span className="font-mono">{level.today.total} XP</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            解答 {level.today.answers} + 時間 {level.today.time} + ボーナス {level.today.bonus}
            {level.today.multiplier > 1 && ` × 連続 ${level.today.multiplier.toFixed(2)}`}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 mb-1">日別の経験値(直近14日)</p>
          <div className="flex items-end gap-1 h-20">
            {level.recentDays.map((d) => (
              <div
                key={d.date}
                className="flex-1 rounded-t bg-[#8fae4e]"
                style={{ height: `${(d.xp / maxDay) * 100}%` }}
                title={`${d.date}: ${d.xp} XP`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
