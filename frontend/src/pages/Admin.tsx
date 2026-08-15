import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [saved, setSaved] = useState<any | null>(null);
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const submitWord = async () => {
    if (!word || word.trim() === "") return alert("単語を入力してください");
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: word.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || String(res.status));
      }
      const data = await res.json();
      setSaved(data);
      setWord("");
    } catch (e: any) {
      alert("登録に失敗しました: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/admin/words`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setWords(data || []);
    } catch (e) {
      alert("単語一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1724] text-slate-200 p-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">管理ページ</h1>
          <button onClick={() => navigate('/')} className="text-sm px-3 py-2 bg-slate-200 rounded text-slate-900">ホームへ戻る</button>
        </div>

        <section className="mb-8 bg-white/5 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-white">単語登録</h2>
          <div className="flex gap-3">
            <input className="flex-1 p-3 rounded bg-white/90 text-slate-900" placeholder="単語 (English)" value={word} onChange={e => setWord(e.target.value)} />
            <button onClick={submitWord} disabled={loading} className="px-4 py-3 bg-[#8fae4e] text-white rounded">{loading ? '登録中...' : '登録'}</button>
            <button onClick={loadWords} disabled={loading} className="px-4 py-3 bg-slate-700 text-white rounded">一覧取得</button>
          </div>

          {saved && (
            <div className="mt-4 bg-white/90 rounded p-4 text-slate-900">
              <h3 className="font-semibold">保存結果</h3>
              <p><strong>単語:</strong> {saved.word}</p>
              <p><strong>英語定義:</strong> {saved.meaningEn}</p>
              <p><strong>英語例文:</strong> {saved.exampleEn}</p>
              <p><strong>日本語訳(定義):</strong> {saved.meaningJa}</p>
              <p><strong>日本語訳(例文):</strong> {saved.exampleJa}</p>
            </div>
          )}
        </section>

        <section className="bg-white/5 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">DB に保存されている単語</h2>
          {words.length === 0 ? (
            <p className="text-sm text-slate-400">まだデータがありません。『一覧取得』をクリックしてください。</p>
          ) : (
            <div className="space-y-3">
              {words.map(w => (
                <div key={w.id} className="bg-white/90 p-3 rounded text-slate-900">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{w.word}</div>
                      <div className="text-sm text-slate-700">{w.meaningJa || w.meaningEn}</div>
                    </div>
                    <div className="text-sm text-slate-500">{new Date(w.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
