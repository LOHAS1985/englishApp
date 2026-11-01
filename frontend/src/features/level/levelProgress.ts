import type { LevelSummary } from "../../api/client";

/** 今のレベルから次のレベルまでの進み具合(0〜1)。Lv.100 は 1 */
export function levelProgress(level: LevelSummary) {
  if (level.nextLevelXp === null) return 1;
  const span = level.nextLevelXp - level.levelStartXp;
  return span <= 0 ? 1 : Math.min(1, (level.totalXp - level.levelStartXp) / span);
}
