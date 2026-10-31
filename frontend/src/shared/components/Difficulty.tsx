/** 問題の難易度(サーバーの Difficulty と同じ 1〜3) */
const LABELS: Record<number, string> = { 1: "基礎", 2: "標準", 3: "発展" };
const BADGE_STYLES: Record<number, string> = {
  1: "bg-sky-50 text-sky-700 border-sky-200",
  2: "bg-slate-50 text-slate-600 border-slate-200",
  3: "bg-amber-50 text-amber-700 border-amber-300",
};

export function DifficultyBadge({ level }: { level: number }) {
  return (
    <span className={`inline-block text-xs border rounded px-2 py-0.5 ${BADGE_STYLES[level] ?? BADGE_STYLES[2]}`}>
      {LABELS[level] ?? LABELS[2]}
    </span>
  );
}

/** 出題する難易度の選択。undefined は「自動」(直近の正答率に合わせてサーバーが選ぶ) */
export function DifficultySelect({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (level: number | undefined) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-slate-500">
      難易度
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
        className="border border-slate-300 rounded px-2 py-1 text-sm text-slate-700 bg-white"
      >
        <option value="">自動(正答率に合わせる)</option>
        <option value="1">基礎</option>
        <option value="2">標準</option>
        <option value="3">発展</option>
      </select>
    </label>
  );
}
