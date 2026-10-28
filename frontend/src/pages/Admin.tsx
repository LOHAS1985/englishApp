import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAdminWord,
  deleteAdminWord,
  fetchAdminWords,
  updateAdminWord,
  type AdminWord,
  type AdminWordForm,
} from "../api/client";

// 編集フォームの英語定義以降の入力欄(単語は1行の input、残りは textarea)
const TEXT_FIELDS = ["meaningEn", "exampleEn", "meaningJa", "exampleJa"] as const;

/** API 側の既定文言とサーバーのエラー文言の両方に対応する */
function alertFailure(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  alert(message === action ? action : `${action}: ${message}`);
}

export default function Admin() {
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [meaningEn, setMeaningEn] = useState("");
  const [exampleEn, setExampleEn] = useState("");
  const [saved, setSaved] = useState<AdminWord | null>(null);
  const [words, setWords] = useState<AdminWord[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<AdminWordForm | null>(null);
  const [loading, setLoading] = useState(false);

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const submitWord = async () => {
    if (!word || word.trim() === "") return alert("単語を入力してください");
    setLoading(true);
    try {
      const data = await createAdminWord({
        word: word.trim(),
        meaningEn: meaningEn.trim() || undefined,
        exampleEn: exampleEn.trim() || undefined,
      });
      setSaved(data);
      setWord("");
      setMeaningEn("");
      setExampleEn("");
    } catch (error: unknown) {
      alertFailure("登録に失敗しました", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async () => {
    setLoading(true);
    try {
      setWords((await fetchAdminWords()) || []);
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
      const updated = await updateAdminWord(editingId, editForm);
      setWords((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      cancelEditing();
    } catch (error: unknown) {
      alertFailure("更新に失敗しました", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteWord = async (selectedWord: AdminWord) => {
    if (!window.confirm(`「${selectedWord.word}」を削除しますか？`)) return;
    setLoading(true);
    try {
      await deleteAdminWord(selectedWord.id);
      setWords((current) =>
        current.filter((item) => item.id !== selectedWord.id),
      );
      if (editingId === selectedWord.id) cancelEditing();
    } catch (error: unknown) {
      alertFailure("削除に失敗しました", error);
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
                      {TEXT_FIELDS.map((field) => (
                        <textarea
                          key={field}
                          className="p-2 border rounded"
                          value={editForm[field]}
                          onChange={(event) =>
                            setEditForm({ ...editForm, [field]: event.target.value })
                          }
                        />
                      ))}
                      <div className="flex gap-3">
                        <button
                          onClick={saveEdit}
                          disabled={loading}
                          className="px-3 py-2 bg-[#8fae4e] text-white rounded"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEditing}
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
