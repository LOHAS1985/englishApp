import { useEffect, useState } from "react";
import { fetchWeakness, type WeaknessItem } from "../api/client";
import { TYPE_LABELS } from "../shared/exams";

/** 1〜2問の結果で苦手と決めつけないよう、この数以上解いた分類だけを苦手に挙げる */
const MIN_ANSWERS = 5;
/** これ未満の正答率を苦手として赤で示す(930点の目安は各パート9割前後) */
const WEAK_RATE = 70;

const rate = (i: WeaknessItem) => Math.round((i.correct / i.total) * 100);

/** 文法の分野・語彙の品詞・読解/リスニングの設問タイプ別の正答率(弱点分析) */
export default function WeaknessSection() {
  const [items, setItems] = useState<WeaknessItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchWeakness()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-[#c0392b] mb-8">{error}</p>;
  if (!items) return null;

  const worst = items
    .filter((i) => i.total >= MIN_ANSWERS)
    .sort((a, b) => rate(a) - rate(b))
    .slice(0, 6);
  const byType = new Map<string, WeaknessItem[]>();
  for (const i of items) byType.set(i.type, [...(byType.get(i.type) ?? []), i]);

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-1">弱点分析(分野・設問タイプ別)</h2>
      <p className="text-xs text-slate-500 mb-3">
        文法は分野(時制・関係詞など)、語彙は品詞、読解・リスニングは設問タイプ(推測・NOT問題・発言の意図など)ごとの全期間の正答率です。
      </p>
      {worst.length === 0 ? (
        <p className="text-sm text-slate-500">分類ごとに{MIN_ANSWERS}問以上解くと、苦手な順に表示されます。</p>
      ) : (
        <div className="space-y-2 mb-4">
          {worst.map((i) => (
            <Row key={`${i.type}-${i.category}`} item={i} showType />
          ))}
        </div>
      )}
      {byType.size > 0 && (
        <div className="space-y-2">
          {[...byType.entries()].map(([type, list]) => (
            <details key={type} className="bg-white border border-slate-200 rounded-md px-4 py-2">
              <summary className="cursor-pointer text-sm">
                {TYPE_LABELS[type] ?? type}
                <span className="text-xs text-slate-400">(全分類)</span>
              </summary>
              <div className="space-y-2 mt-2 mb-1">
                {list.map((i) => (
                  <Row key={i.category} item={i} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function Row({ item, showType = false }: { item: WeaknessItem; showType?: boolean }) {
  const r = rate(item);
  const weak = item.total >= MIN_ANSWERS && r < WEAK_RATE;
  return (
    <div className={showType ? "bg-white border border-slate-200 rounded-md px-4 py-3" : ""}>
      <div className="flex justify-between text-sm mb-1 gap-3">
        <span className="truncate">
          {showType && <span className="text-xs text-slate-500 mr-2">{TYPE_LABELS[item.type] ?? item.type}</span>}
          {item.category}
        </span>
        <span className={`font-mono shrink-0 ${weak ? "text-[#c0392b]" : ""}`}>
          {r}%<span className="text-slate-400">({item.correct}/{item.total})</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded">
        <div
          className={`h-1.5 rounded ${weak ? "bg-[#c0392b]" : "bg-[#8fae4e]"}`}
          style={{ width: `${r}%` }}
        />
      </div>
    </div>
  );
}
