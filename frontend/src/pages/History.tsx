import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWritingHistory, type WritingHistoryItem } from "../api/client";
import { useAuth } from "../context/useAuth";
import Header from "../components/Header";

export default function History() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<WritingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchWritingHistory(token)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <p className="text-sm text-slate-400">読み込み中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex justify-center px-5 py-12">
      <Header />
      <div className="w-full max-w-[640px]">
        <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
          HISTORY
        </p>
        <h1 className="font-serif text-2xl text-slate-900 mb-6">
          ライティング履歴
        </h1>

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
      </div>
    </div>
  );
}
