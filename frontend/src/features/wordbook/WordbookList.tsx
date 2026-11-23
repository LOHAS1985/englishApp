import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addWordbookWord,
  deleteWordbookWord,
  fetchWordbookWords,
  setWordbookColor,
  setWordbookExample,
  setWordbookMeaning,
  type WordbookColor,
  type WordbookWord,
} from "../../api/client";
import Header from "../../shared/components/Header";
import ColorButtons from "./ColorButtons";
import PronounceButton from "./PronounceButton";
import SenseList from "./SenseList";
import {
  COLOR_LABELS,
  COLOR_ORDER,
  FILTER_LABELS,
  PAGE_SIZE,
  SORT_LABELS,
  dueLabel,
  matchesFilter,
  matchesQuery,
  sortWords,
  todayJst,
  toHeadword,
  type WordFilter,
  type WordSort,
} from "./wordbookRules";
import { messageOf } from "../../shared/errorMessage";

const FILTERS: WordFilter[] = ["ALL", "DUE", "UNSEEN", ...COLOR_ORDER];
const SORTS = Object.keys(SORT_LABELS) as WordSort[];

const filterLabel = (f: WordFilter) => (f === "ALL" || f === "DUE" || f === "UNSEEN" ? FILTER_LABELS[f] : COLOR_LABELS[f]);

/** 訳が揃うまでの表示。FAILED は翌日の調査で取り直す */
function translationNote(word: WordbookWord): string | null {
  if (word.translationStatus === "DONE") return null;
  return word.translationStatus === "FAILED" ? "訳を取得できず(翌日に再調査)" : "訳を調査中";
}

/**
 * 単語帳の一覧。色・今日の復習・未学習で絞り込み、検索(語・訳・例文)、並べ替え、色の付け替え、
 * 訳と例文の修正、手動追加、削除ができる。語が多いので50語ずつ出す。
 */
export default function WordbookList() {
  const navigate = useNavigate();
  const [words, setWords] = useState<WordbookWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<WordFilter>("ALL");
  const [sort, setSort] = useState<WordSort>("ADDED");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [newWord, setNewWord] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMeaning, setEditMeaning] = useState("");
  /** 例文を直している語と、入力中の内容 */
  const [exampleEditId, setExampleEditId] = useState<number | null>(null);
  const [exampleDraft, setExampleDraft] = useState({ en: "", answer: "", ja: "" });

  const today = useMemo(() => todayJst(), []);

  const reload = () =>
    fetchWordbookWords()
      .then(setWords)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    void reload();
  }, []);

  const matched = useMemo(
    () => sortWords(words.filter((w) => matchesFilter(w, filter, today) && matchesQuery(w, query)), sort),
    [words, filter, query, sort, today],
  );
  const shown = matched.slice(0, visible);

  const countOf = (f: WordFilter) => words.filter((w) => matchesFilter(w, f, today)).length;

  // 絞り込み・検索・並べ替えを変えたら、先頭の50語から見直す
  const resetPage = () => setVisible(PAGE_SIZE);

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
      setNotice(messageOf(e, "登録に失敗しました"));
    }
  };

  const changeColor = async (word: WordbookWord, color: WordbookColor) => {
    try {
      const updated = await setWordbookColor(word.id, color);
      setWords((current) => current.map((w) => (w.id === updated.id ? updated : w)));
    } catch (e) {
      setNotice(messageOf(e, "色の変更に失敗しました"));
    }
  };

  const saveMeaning = async (word: WordbookWord) => {
    try {
      const updated = await setWordbookMeaning(word.id, editMeaning);
      setWords((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      setEditingId(null);
    } catch (e) {
      setNotice(messageOf(e, "訳の変更に失敗しました"));
    }
  };

  const saveExample = async (word: WordbookWord) => {
    try {
      const updated = await setWordbookExample(word.id, exampleDraft.en, exampleDraft.answer, exampleDraft.ja);
      setWords((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      setExampleEditId(null);
      setNotice(
        updated.exampleJa ? "" : "例文の訳が空なので、翌日の調査で取り直します(それまで穴埋めには出ません)",
      );
    } catch (e) {
      setNotice(messageOf(e, "例文の変更に失敗しました"));
    }
  };

  const remove = async (word: WordbookWord) => {
    if (!window.confirm(`「${word.word}」を単語帳から削除しますか?`)) return;
    try {
      await deleteWordbookWord(word.id);
      setWords((current) => current.filter((w) => w.id !== word.id));
    } catch (e) {
      setNotice(messageOf(e, "削除に失敗しました"));
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
              onClick={() => {
                setFilter(f);
                resetPage();
              }}
              aria-pressed={filter === f}
              className={`text-sm rounded-full border px-3 py-1 transition-colors ${
                filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 hover:bg-slate-100"
              }`}
            >
              {filterLabel(f)} {countOf(f)}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            aria-label="検索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            placeholder="英単語・訳・例文で検索"
            className="flex-1 border border-slate-300 rounded px-3 py-2 text-sm"
          />
          <select
            aria-label="並べ替え"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as WordSort);
              resetPage();
            }}
            className="border border-slate-300 rounded px-3 py-2 text-sm bg-white"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-sm text-slate-400">読み込み中…</p>}
        {error && <p className="text-sm text-[#c0392b]">{error}</p>}
        {!loading && !error && matched.length === 0 && <p className="text-sm text-slate-500">該当する単語がありません。</p>}

        <ul className="space-y-3">
          {shown.map((word) => (
            <li key={word.id} className="rounded-lg bg-white border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold flex items-center gap-2">
                    {word.word}
                    <PronounceButton word={word.word} />
                  </p>
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
                  <SenseList senses={word.senses} className="mt-1" />
                  {exampleEditId === word.id ? (
                    <div className="mt-2 space-y-2">
                      <input
                        aria-label="例文(英語)"
                        value={exampleDraft.en}
                        onChange={(e) => setExampleDraft({ ...exampleDraft, en: e.target.value })}
                        className="w-full border border-slate-300 rounded px-3 py-1 text-sm"
                      />
                      <input
                        aria-label="空欄にする語"
                        value={exampleDraft.answer}
                        onChange={(e) => setExampleDraft({ ...exampleDraft, answer: e.target.value })}
                        placeholder="例文の中で空欄にする語(変化形でもよい)"
                        className="w-full border border-slate-300 rounded px-3 py-1 text-sm"
                      />
                      <input
                        aria-label="例文の訳"
                        value={exampleDraft.ja}
                        onChange={(e) => setExampleDraft({ ...exampleDraft, ja: e.target.value })}
                        placeholder="例文の訳(空なら翌日に自動で調べます)"
                        className="w-full border border-slate-300 rounded px-3 py-1 text-sm"
                      />
                      <div className="flex gap-3 text-sm">
                        <button onClick={() => saveExample(word)} className="text-[#2463a8] hover:underline">
                          保存
                        </button>
                        <button onClick={() => setExampleEditId(null)} className="text-slate-500 hover:underline">
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    word.exampleEn && (
                      <div className="text-sm text-slate-500 mt-1 flex items-start gap-2">
                        <p className="flex-1">
                          {word.exampleEn}
                          {word.exampleJa && <span className="block text-slate-400">{word.exampleJa}</span>}
                        </p>
                        <PronounceButton word={word.exampleEn} label="例文を再生" />
                      </div>
                    )
                  )}
                  {word.meaningJa && translationNote(word) && (
                    <p className="text-xs text-slate-400 mt-1">{translationNote(word)}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {word.timesAsked === 0
                      ? "まだ出していません"
                      : `出題 ${word.timesAsked}回・正解 ${word.timesCorrect}回・次の復習 ${dueLabel(word.nextDueDate, today)}`}
                  </p>
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
                    <button
                      onClick={() => {
                        setExampleEditId(word.id);
                        setExampleDraft({
                          en: word.exampleEn ?? "",
                          answer: word.exampleAnswer ?? word.word,
                          ja: word.exampleJa ?? "",
                        });
                      }}
                      className="text-slate-600 hover:underline"
                    >
                      例文を直す
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

        {matched.length > shown.length && (
          <button
            onClick={() => setVisible((n) => n + PAGE_SIZE)}
            className="mt-4 w-full text-sm text-[#2463a8] border border-slate-200 rounded-lg bg-white py-3 hover:bg-slate-100"
          >
            もっと見る(あと {matched.length - shown.length} 語)
          </button>
        )}
      </div>
    </div>
  );
}
