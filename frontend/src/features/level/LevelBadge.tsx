import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLevel, type LevelSummary } from "../../api/client";
import { levelProgress } from "./levelProgress";

/** ヘッダーに出す現在のレベルと、次のレベルまでに必要な経験値。押すとマイページのレベル欄へ */
export default function LevelBadge() {
  const [level, setLevel] = useState<LevelSummary | null>(null);

  useEffect(() => {
    // 画面を移るたびに取り直し、解答した分の経験値を反映する(失敗してもヘッダーは表示する)
    fetchLevel()
      .then(setLevel)
      .catch(() => setLevel(null));
  }, []);

  // サーバーの起動待ちの間も、マイページへの入口として残す(スマホでは「学習記録」ボタンを隠しているため)
  if (!level) {
    return (
      <Link to="/mypage" className="rounded px-2 py-1 font-mono text-sm text-white/80 hover:bg-white/10">
        Lv.…
      </Link>
    );
  }

  return (
    <Link
      to="/mypage"
      className="flex items-center gap-2 rounded px-2 py-1 text-white hover:bg-white/10 transition-colors"
      title={`累計 ${level.totalXp.toLocaleString()} XP`}
    >
      <span className="font-mono text-sm font-semibold">Lv.{level.level}</span>
      <span className="font-mono text-xs text-white/80 whitespace-nowrap">
        {level.nextLevelXp === null
          ? "MAX"
          : `次まで ${(level.nextLevelXp - level.totalXp).toLocaleString()} XP`}
      </span>
      <span className="hidden sm:block w-20 h-1.5 bg-white/20 rounded">
        <span
          className="block h-1.5 bg-[#8fae4e] rounded"
          style={{ width: `${levelProgress(level) * 100}%` }}
        />
      </span>
    </Link>
  );
}
