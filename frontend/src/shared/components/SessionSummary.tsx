import { accuracyPercent, formatStudyTime, type Tally } from "../sessionTally";

interface Props {
  tally: Tally;
  /** 正解数の後ろに添える補足(例: 3セット) */
  extra?: string;
  onContinue: () => void;
  onHome: () => void;
}

/** 「終了する」を押したときの、今回の練習のまとめ。1日30分の達成感と、弱点の確認のために出す */
export default function SessionSummary({ tally, extra, onContinue, onHome }: Props) {
  const accuracy = accuracyPercent(tally);
  return (
    <div role="status" aria-live="polite">
      <h2 className="font-serif text-xl text-slate-900 mb-4">今回の練習</h2>
      <dl className="grid grid-cols-3 gap-3 mb-4">
        <div className="border border-slate-200 rounded p-3">
          <dt className="text-xs text-slate-500">解いた数</dt>
          <dd className="font-mono text-xl font-semibold text-slate-900">{tally.answered}問</dd>
        </div>
        <div className="border border-slate-200 rounded p-3">
          <dt className="text-xs text-slate-500">正答率</dt>
          <dd className="font-mono text-xl font-semibold text-slate-900">
            {accuracy === null ? "-" : `${accuracy}%`}
          </dd>
        </div>
        <div className="border border-slate-200 rounded p-3">
          <dt className="text-xs text-slate-500">時間</dt>
          <dd className="font-mono text-xl font-semibold text-slate-900">{formatStudyTime(tally.seconds)}</dd>
        </div>
      </dl>
      <p className="text-sm text-slate-600 mb-6">
        {tally.correct} / {tally.answered} 問正解{extra ? `(${extra})` : ""}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onHome}
          className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
        >
          ホームへ
        </button>
        <button
          onClick={onContinue}
          className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded px-5 py-3 hover:border-slate-400 transition-colors"
        >
          続ける
        </button>
      </div>
    </div>
  );
}
