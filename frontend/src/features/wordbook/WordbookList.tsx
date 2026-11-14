import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addWordbookWord,
  deleteWordbookWord,
  fetchWordbookWords,
  setWordbookColor,
  setWordbookMeaning,
  type WordbookColor,
  type WordbookWord,
} from "../../api/client";
import Header from "../../shared/components/Header";
import ColorButtons from "./ColorButtons";
import { COLOR_LABELS, COLOR_ORDER, toHeadword } from "./wordbookRules";

/** 一覧の絞り込み。ALL は色で絞らない */
type Filter = WordbookColor | "ALL";

const FILTERS: Filter[] = ["ALL", ...COLOR_ORDER];

/** 訳が揃うまでの表示。FAILED は翌日の調査で取り直す */
function translationNote(word: WordbookWord): string | null {
  if (word.translationStatus === "DONE") return null;
  return word.translationStatus === "FAILED" ? "訳を取得できず(翌日に再調査)" : "訳を調査中";
}

/** 単語帳の一覧。色の絞り込み・検索・色の付け替え・訳の修正・手動追加・削除 */
export default function WordbookList() {
  const navigate = useNavigate();
  const [words, setWords] = useState<WordbookWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [newWord, setNewWord] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMeaning, setEditMeaning] = useState("");

  const reload = () =>
    fetchWordbookWords()
      .then(setWords)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  const shown = words.filter((w) => {
    if (filter !== "ALL" && w.color !== filter) return false;
    const q = query.trim().toLowerCase();
    if (q === "") return true;
    return w.word.includes(q) || (w.meaningJa ?? "").includes(q);
  });

  const countOf = (f: Filter) => (f === "ALL" ? words.length : words.filter((w) => w.color === f).length);

  const add = async () => {
    const word = toHeadword(newWord);
    if (!word) {
      setNotice("英単語1語を入力してください");
      return;
    }
    try {
      const result = await addWordbookWord(word);
      setNotice(
        result.added
          ? `「${result.word.word}」を追加しました(訳は毎日7時に調べます)`
          : `「${result.word.word}」はすでに単語帳にあります`,
      );
      setNewWord("");
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "登録に失敗しました");
    }
  };

  const changeColor = async (word: WordbookWord, color: WordbookColor) => {
    try {
      const updated = await setWordbookColor(word.id, color);
      setWords((current) => current.map((w) => (w.id === updated.id ? updated : w)));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "色の変更に失敗しました");
    }
  };

  const saveMeaning = async (word: WordbookWord) => {
    try {
      const updated = await setWordbookMeaning(word.id, editMeaning);
      setWords((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      setEditingId(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "訳の変更に失敗しました");
    }
  };

  const remove = async (word: WordbookWord) => {
    if (!window.confirm(`「${word.word}」を単語帳から削除しますか?`)) return;
    try {
      await deleteWordbookWord(word.id);
      setWords((current) => current.filter((w) => w.id !== word.id));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <div className="max-w-[840px] mx-auto px-5 py-10">
        <button onClick={() => navigate("/wordbook")} className="text-sm text-[#2463a8] hover:underline mb-4">
          ← 単語帳へ戻る
        </button>
        <h1 className="font-serif text-2xl mb-6">単語一覧</h1>

        <div className="rounded-lg bg-white border border-slate-200 p-4 mb-6">
          <p className="text-sm font-semibold text-slate-700 mb-2">単語を追加</p>
          <div className="flex gap-3">
            <input
              aria-label="追加する単語"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="英単語(1語)"
              className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
            />
            <button
              onClick={add}
              className="text-sm font-semibold text-white bg-[#16233d] rounded px-4 py-2 hover:bg-[#23365c] transition-colors"
            >
              追加
            </button>
          </div>
          {notice && <p className="text-sm text-slate-600 mt-2">{notice}</p>}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm rounded-full border px-3 py-1 transition-colors ${
                filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 hover:bg-slate-100"
              }`}
            >
              {f === "ALL" ? "すべて" : COLOR_LABELS[f]} {countOf(f)}
            </button>
          ))}
        </div>
        <input
          aria-label="検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="英単語・訳で検索"
          className="w-full border border-slate-300 rounded px-3 py-2 text-sm mb-6"
        />

        {loading && <p className="text-sm text-slate-400">読み込み中…</p>}
        {error && <p className="text-sm text-[#c0392b]">{error}</p>}
        {!loading && !error && shown.length === 0 && <p className="text-sm text-slate-500">該当する単語がありません。</p>}

        <ul className="space-y-3">
          {shown.map((word) => (
            <li key={word.id} className="rounded-lg bg-white border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{word.word}</p>
                  {editingId === word.id ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        aria-label="訳"
                        value={editMeaning}
                        onChange={(e) => setEditMeaning(e.target.value)}
                        className="flex-1 border border-slate-300 rounded px-3 py-1 text-sm"
                      />
                      <button onClick={() => saveMeaning(word)} className="text-sm text-[#2463a8] hover:underline">
                        保存
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 hover:underline">
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700">
                      {word.meaningJa ?? <span className="text-slate-400">{translationNote(word)}</span>}
                    </p>
                  )}
                  {word.exampleEn && (
                    <p className="text-sm text-slate-500 mt-1">
                      {word.exampleEn}
                      {word.exampleJa && <span className="block text-slate-400">{word.exampleJa}</span>}
                    </p>
                  )}
                  {word.meaningJa && translationNote(word) && (
                    <p className="text-xs text-slate-400 mt-1">{translationNote(word)}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <ColorButtons value={word.color} onChange={(c) => changeColor(word, c)} />
                  <div className="flex gap-3 text-sm">
                    <button
                      onClick={() => {
                        setEditingId(word.id);
                        setEditMeaning(word.meaningJa ?? "");
                      }}
                      className="text-slate-600 hover:underline"
                    >
                      訳を直す
                    </button>
                    <button onClick={() => remove(word)} className="text-[#c0392b] hover:underline">
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
