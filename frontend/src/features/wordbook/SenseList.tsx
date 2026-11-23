import type { WordbookSense } from "../../api/client";

/**
 * 品詞ごとの主な意味。出題の意味(例: remedy の名詞「改善策」)だけを見て、
 * ほかの品詞・意味(動詞「を改善する」)が無いと思い込まないように並べて出す。
 */
export default function SenseList({ senses, className = "" }: { senses?: WordbookSense[]; className?: string }) {
  if (!senses || senses.length === 0) return null;
  return (
    <dl className={`text-sm space-y-1 ${className}`} aria-label="品詞ごとの主な意味">
      {senses.map((s) => (
        <div key={s.pos} className="flex gap-2">
          <dt className="shrink-0 rounded border border-slate-300 px-1.5 text-xs leading-5 text-slate-600">{s.pos}</dt>
          <dd className="text-slate-700">{s.meaningJa}</dd>
        </div>
      ))}
    </dl>
  );
}
