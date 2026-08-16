import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/context/useAuth";

interface AdminWord {
  id: number;
  word: string;
  meaningEn: string;
  exampleEn: string;
  meaningJa: string;
  exampleJa: string;
  createdAt: string;
}

type WordForm = Pick<
  AdminWord,
  "word" | "meaningEn" | "exampleEn" | "meaningJa" | "exampleJa"
>;

export default function Admin() {
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [meaningEn, setMeaningEn] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [saved, setSaved] = useState<AdminWord | null>(null);
  const [words, setWords] = useState<AdminWord[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<WordForm | null>(null);
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const submitWord = async () => {
    if (!word || word.trim() === "") return alert("単語を入力してください");
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/words`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            word: word.trim(),
            meaningEn: meaningEn.trim() || undefined,
            exampleEn: exampleEn.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error || String(res.status));
      }
      const data = (await res.json()) as AdminWord;
      setSaved(data);
      setWord("");
      setMeaningEn("");
      setExampleEn("");
    } catch (error: unknown) {
      alert(
        "登録に失敗しました: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/words`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as AdminWord[];
      setWords(data || []);
    } catch {
      alert("単語一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (selectedWord: AdminWord) => {
    setEditingId(selectedWord.id);
    setEditForm({
      word: selectedWord.word ?? "",
      meaningEn: selectedWord.meaningEn ?? "",
      exampleEn: selectedWord.exampleEn ?? "",
      meaningJa: selectedWord.meaningJa ?? "",
      exampleJa: selectedWord.exampleJa ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editForm || editingId === null || !editForm.word.trim()) {
      return alert("単語を入力してください");
    }
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/words/${editingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(editForm),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(err?.error || String(res.status));
      }
      const updated = (await res.json()) as AdminWord;
      setWords((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setEditingId(null);
      setEditForm(null);
    } catch (error: unknown) {
      alert(
        "更新に失敗しました: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteWord = async (selectedWord: AdminWord) => {
    if (!window.confirm(`「${selectedWord.word}」を削除しますか？`)) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/words/${selectedWord.id}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) throw new Error(String(res.status));
      setWords((current) =>
        current.filter((item) => item.id !== selectedWord.id),
      );
      if (editingId === selectedWord.id) {
        setEditingId(null);
        setEditForm(null);
      }
    } catch (error: unknown) {
      alert(
        "削除に失敗しました: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1724] text-slate-200 p-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">管理ページ</h1>
          <button
            onClick={() => navigate("/")}
            className="text-sm px-3 py-2 bg-slate-200 rounded text-slate-900"
          >
            ホームへ戻る
          </button>
        </div>

        <section className="mb-8 bg-white/5 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-white">単語登録</h2>
          <div className="grid gap-3">
            <input
              className="p-3 rounded bg-white/90 text-slate-900"
              placeholder="単語 (English)"
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
            <input
              className="p-3 rounded bg-white/90 text-slate-900"
              placeholder="英語定義（辞書取得に失敗した場合の入力用）"
              value={meaningEn}
              onChange={(e) => setMeaningEn(e.target.value)}
            />
            <input
              className="p-3 rounded bg-white/90 text-slate-900"
              placeholder="英語例文（任意）"
              value={exampleEn}
              onChange={(e) => setExampleEn(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={submitWord}
                disabled={loading}
                className="px-4 py-3 bg-[#8fae4e] text-white rounded"
              >
                {loading ? "登録中..." : "登録"}
              </button>
              <button
                onClick={loadWords}
                disabled={loading}
                className="px-4 py-3 bg-slate-700 text-white rounded"
              >
                一覧取得
              </button>
            </div>
          </div>

          {saved && (
            <div className="mt-4 bg-white/90 rounded p-4 text-slate-900">
              <h3 className="font-semibold">保存結果</h3>
              <p>
                <strong>単語:</strong> {saved.word}
              </p>
              <p>
                <strong>英語定義:</strong> {saved.meaningEn}
              </p>
              <p>
                <strong>英語例文:</strong> {saved.exampleEn}
              </p>
              <p>
                <strong>日本語訳(定義):</strong> {saved.meaningJa}
              </p>
              <p>
                <strong>日本語訳(例文):</strong> {saved.exampleJa}
              </p>
            </div>
          )}
        </section>

        <section className="bg-white/5 p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">
            DB に保存されている単語
          </h2>
          {words.length === 0 ? (
            <p className="text-sm text-slate-400">
              まだデータがありません。『一覧取得』をクリックしてください。
            </p>
          ) : (
            <div className="space-y-3">
              {words.map((w) => (
                <div
                  key={w.id}
                  className="bg-white/90 p-4 rounded text-slate-900"
                >
                  {editingId === w.id && editForm ? (
                    <div className="grid gap-3">
                      <input
                        className="p-2 border rounded"
                        value={editForm.word}
                        onChange={(event) =>
                          setEditForm({ ...editForm, word: event.target.value })
                        }
                      />
                      <textarea
                        className="p-2 border rounded"
                        value={editForm.meaningEn}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            meaningEn: event.target.value,
                          })
                        }
                      />
                      <textarea
                        className="p-2 border rounded"
                        value={editForm.exampleEn}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            exampleEn: event.target.value,
                          })
                        }
                      />
                      <textarea
                        className="p-2 border rounded"
                        value={editForm.meaningJa}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            meaningJa: event.target.value,
                          })
                        }
                      />
                      <textarea
                        className="p-2 border rounded"
                        value={editForm.exampleJa}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            exampleJa: event.target.value,
                          })
                        }
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={saveEdit}
                          disabled={loading}
                          className="px-3 py-2 bg-[#8fae4e] text-white rounded"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setEditForm(null);
                          }}
                          className="px-3 py-2 bg-slate-300 rounded"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="font-semibold">{w.word}</div>
                        <div className="text-sm text-slate-700">
                          {w.meaningJa || w.meaningEn}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-slate-500">
                          {new Date(w.createdAt).toLocaleString()}
                        </div>
                        <button
                          onClick={() => startEditing(w)}
                          className="px-3 py-2 bg-slate-700 text-white rounded"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => deleteWord(w)}
                          className="px-3 py-2 bg-red-700 text-white rounded"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
