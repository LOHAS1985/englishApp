import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWritingHistory, type WritingHistoryItem } from "../api/client";
import Header from "../shared/components/Header";
import AccessLogSection from "./AccessLogSection";
import StudyStatsSection from "./StudyStatsSection";

export default function MyPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WritingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    fetchWritingHistory()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <p className="text-sm text-slate-400">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-5 py-12 text-slate-900">
      <Header />
      <main className="w-full max-w-[840px] mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-slate-400">
              MY PAGE
            </p>
            <h1 className="font-serif text-2xl text-slate-900">学習記録</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="text-sm font-semibold text-[#0f1724] bg-[#f59e0b] rounded px-4 py-2 hover:bg-[#d97706] transition-colors"
            >
              管理画面
            </button>
          </div>
        </div>

        <StudyStatsSection />

        <AccessLogSection />

        <section className="mb-8">
          <h2 className="font-serif text-xl text-slate-900 mb-3">
            ライティング履歴
          </h2>
          {items.length === 0 && (
            <p className="text-sm text-slate-500">まだ記録がありません。</p>
          )}

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-md p-5 cursor-pointer"
                onClick={() => setOpenId(openId === item.id ? null : item.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleString("ja-JP")}
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-900">
                    {item.totalScore} / 16
                  </span>
                </div>
                <p className="font-serif text-base text-slate-900 leading-relaxed">
                  {item.topic}
                </p>

                {openId === item.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {item.answer}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>内容: {item.contentScore} / 4</div>
                      <div>構成: {item.structureScore} / 4</div>
                      <div>語彙: {item.vocabularyScore} / 4</div>
                      <div>文法: {item.grammarScore} / 4</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
