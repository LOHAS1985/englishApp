const OPTIONS: { value: number | undefined; label: string }[] = [
  { value: undefined, label: "自動" },
  { value: 1, label: "基礎" },
  { value: 2, label: "標準" },
  { value: 3, label: "発展" },
  { value: 4, label: "難関" },
  { value: 5, label: "最難関" },
];

/**
 * 出題する難易度の選択(サーバーの Difficulty と同じ 1〜5)。問題を解く前にホームで一度だけ選ぶ。
 * undefined は「自動」(直近の正答率に合わせて選ぶ)
 */
export function DifficultySelect({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (level: number | undefined) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-slate-700">難易度</span>
      {OPTIONS.map((o) => (
        <button
          key={o.label}
          onClick={() => onChange(o.value)}
          className={`text-sm rounded-full border px-3 py-1.5 transition-colors ${
            value === o.value
              ? "bg-[#16233d] border-[#16233d] text-white"
              : "bg-white border-slate-300 text-slate-600 hover:border-[#16233d]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
