import { useEffect, useState } from "react";
import { fetchReadingSpeed, type ReadingSpeedItem } from "../api/client";
import { TYPE_LABELS } from "../shared/exams";

const RECENT = 5;
const CHART_POINTS = 10;

/** 形式ごとの読解速度(語/分)。計測は「Part 7 速読」などの速度計測モードで行う */
export default function ReadingSpeedSection() {
  const [items, setItems] = useState<ReadingSpeedItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReadingSpeed()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!items) return null;

  // 届くのは新しい順。形式ごとにまとめ、推移は古い順に並べる
  const byType = new Map<string, ReadingSpeedItem[]>();
  for (const i of [...items].reverse()) byType.set(i.itemType, [...(byType.get(i.itemType) ?? []), i]);

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-1">読解速度(語/分)</h2>
      <p className="text-xs text-slate-500 mb-3">
        本文を読み終えるまでの語数と時間から出します。設問に答える時間は含みません。ホームの「読解速度計測」から測れます。
      </p>
      {byType.size === 0 ? (
        <p className="text-sm text-slate-500">まだ計測していません。</p>
      ) : (
        <div className="space-y-2">
          {[...byType.entries()].map(([type, list]) => {
            const latest = list[list.length - 1];
            const recent = list.slice(-RECENT);
            const average = Math.round(recent.reduce((sum, i) => sum + i.wpm, 0) / recent.length);
            const max = Math.max(...list.slice(-CHART_POINTS).map((i) => i.wpm));
            return (
              <div key={type} className="bg-white border border-slate-200 rounded-md p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-900">{TYPE_LABELS[type] ?? type}</p>
                  <p className="text-xs text-slate-500">
                    直近{Math.min(RECENT, list.length)}回の平均 <span className="font-mono text-slate-900">{average}</span> 語/分・
                    最新 <span className="font-mono text-slate-900">{latest.wpm}</span> 語/分・計 {list.length} 回
                  </p>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {list.slice(-CHART_POINTS).map((i, idx) => (
                    <div
                      key={`${i.createdAt}-${idx}`}
                      className="flex-1 bg-[#2463a8] rounded-t"
                      style={{ height: `${Math.max(6, (i.wpm / (max || 1)) * 100)}%` }}
                      title={`${i.wpm} 語/分(${i.words} 語 / ${i.readingSeconds} 秒)`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
