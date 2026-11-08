import { Link } from "react-router-dom";
import type { MockPartScore, MockResult, MockSectionScore } from "../../api/client";
import { TYPE_LABELS } from "../../shared/exams";

/** 推定点と目標(930 点)の差。プラスなら目標を上回っている */
const diffText = (value: number, target: number) => (value >= target ? `+${value - target}` : `${value - target}`);

/**
 * 模試の結果。推定点は仮の換算による参考値なので、どの画面でも「参考値」と分かる書き方にする。
 */
export default function MockResultView({ result, onRetry }: { result: MockResult; onRetry: () => void }) {
  return (
    <div>
      <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-1">MOCK RESULT</p>
      <h1 className="font-serif text-2xl text-slate-900 mb-6">模試の結果</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <ScoreCard label="リスニング" score={result.listening} />
        <ScoreCard label="リーディング" score={result.reading} />
        <div className="border border-slate-200 rounded-md p-4 bg-slate-50">
          <p className="text-xs text-slate-500">合計(推定・参考値)</p>
          <p className="font-mono text-3xl font-semibold text-slate-900 mt-1">{result.estimatedTotal}</p>
          <p className="text-xs text-slate-500 mt-1">
            目標 {result.targetTotal} 点(差 <span className="font-mono">{diffText(result.estimatedTotal, result.targetTotal)}</span>)
          </p>
        </div>
      </div>

      <h2 className="font-serif text-lg text-slate-900 mb-2">形式ごとの正解数</h2>
      <table className="w-full text-sm mb-6">
        <tbody>
          {result.parts.map((p) => (
            <PartRow key={p.type} part={p} />
          ))}
        </tbody>
      </table>

      <p className="text-xs text-slate-500 leading-relaxed mb-6">
        推定点は正答率から決めた仮の換算による参考値です。公式のスコアではありません。
        リスニングは Part 1(写真描写)を含まない {result.listening.total} 問で計算しています。
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onRetry}
          className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
        >
          もう一度(新しい模試)
        </button>
        <Link
          to="/mypage"
          className="text-sm font-semibold text-slate-800 border border-slate-300 rounded px-5 py-3 hover:border-[#8fae4e] transition-colors"
        >
          マイページで推移を見る
        </Link>
      </div>
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: MockSectionScore }) {
  const rate = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  return (
    <div className="border border-slate-200 rounded-md p-4">
      <p className="text-xs text-slate-500">{label}(推定・参考値)</p>
      <p className="font-mono text-3xl font-semibold text-slate-900 mt-1">{score.estimated}</p>
      <p className="text-xs text-slate-500 mt-1">
        目標 {score.target}(差 <span className="font-mono">{diffText(score.estimated, score.target)}</span>)
      </p>
      <p className="text-xs text-slate-500 mt-2">
        正解 <span className="font-mono">{score.correct} / {score.total}</span>({rate}%)
      </p>
    </div>
  );
}

function PartRow({ part }: { part: MockPartScore }) {
  const rate = part.total > 0 ? Math.round((part.correct / part.total) * 100) : 0;
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-3">{TYPE_LABELS[part.type] ?? part.type}</td>
      <td className="py-2 pr-3 font-mono text-right">
        {part.correct} / {part.total}
      </td>
      <td className="py-2 font-mono text-right text-slate-500">{rate}%</td>
    </tr>
  );
}
