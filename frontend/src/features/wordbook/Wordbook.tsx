import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchWordbookHistory,
  fetchWordbookSummary,
  type WordbookHistoryItem,
  type WordbookSummary,
} from "../../api/client";
import Header from "../../shared/components/Header";

const MENU = [
  { label: "4択", note: "英単語を見て、日本語の訳を4つから選ぶ", path: "/wordbook/quiz?type=choice" },
  { label: "穴埋め", note: "日本語訳を見て、英文の空所に入る英単語を書く", path: "/wordbook/quiz?type=fill" },
  { label: "一覧・色の管理", note: "単語の色を付け替える・訳を直す・削除する", path: "/wordbook/list" },
];

/** 単語帳のメニュー。どの試験にも属さない独立した機能 */
export default function Wordbook() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<WordbookSummary | null>(null);
  const [history, setHistory] = useState<WordbookHistoryItem[]>([]);

  useEffect(() => {
    fetchWordbookSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
    fetchWordbookHistory()
      .then((items) => setHistory(items.slice(0, 10)))
      .catch(() => setHistory([]));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="max-w-[840px] mx-auto px-5 py-10">
        <button onClick={() => navigate("/")} className="text-sm text-[#2463a8] hover:underline mb-4">
          ← ホームへ戻る
        </button>
        <h1 className="font-serif text-2xl mb-6">単語帳</h1>

        {summary && (
          <div className="grid grid-cols-5 gap-3 mb-4 text-center">
            <Stat label="登録" value={summary.total} />
            <Stat label="無色" value={summary.none} />
            <Stat label="青" value={summary.blue} />
            <Stat label="黄" value={summary.yellow} />
            <Stat label="赤" value={summary.red} />
          </div>
        )}
        {summary && summary.pendingTranslation > 0 && (
          <p className="text-sm text-slate-500 mb-4">
            日本語訳を調査中の単語が {summary.pendingTranslation} 語あります(毎日7時に調べます。訳が揃うまで出題しません)。
          </p>
        )}
        <p className="text-sm text-slate-500 mb-6">
          出題の頻度は色で変わります。無色と赤は多く、黄は中くらい、青は少なく出ます。
        </p>

        <div className="grid grid-cols-1 gap-3 mb-8">
          {MENU.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="text-left rounded-lg bg-white border border-slate-200 shadow-sm p-5 hover:bg-slate-100 transition-colors flex items-center justify-between gap-3"
            >
              <span>
                <span className="block text-lg font-semibold text-slate-900">{item.label}</span>
                <span className="block text-sm text-slate-500">{item.note}</span>
              </span>
              <span className="text-slate-500">→</span>
            </button>
          ))}
        </div>

        <section>
          <h2 className="font-serif text-lg mb-3">最近の解答</h2>
          {history.length === 0 && <p className="text-sm text-slate-500">まだ記録がありません。</p>}
          <ul className="space-y-2">
            {history.map((item, i) => (
              <li key={`${item.wordId}-${i}`} className="flex items-center gap-3 text-sm">
                <span className={item.correct ? "text-[#6a8a3e]" : "text-[#c0392b]"}>
                  {item.correct ? "○" : "×"}
                </span>
                <span className="font-semibold">{item.word}</span>
                <span className="ml-auto text-slate-400">{new Date(item.createdAt).toLocaleString("ja-JP")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
