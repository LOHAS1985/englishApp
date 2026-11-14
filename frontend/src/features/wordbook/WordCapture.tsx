import { useEffect, useRef, useState, type ReactNode } from "react";
import { registerReadingWord } from "../../api/client";
import { sentenceAround, toHeadword } from "./wordbookRules";

interface Pending {
  word: string;
  sentence: string;
}

interface Notice {
  ok: boolean;
  text: string;
}

/**
 * 読解の本文を囲み、選んだ英単語を単語帳に登録できるようにする。
 * 選んだ語を含む文(段落の中の文)を例文として一緒に保存する。
 * 下のバーは利用者が閉じるまで残す(バーを押すと選択が外れるブラウザがあるため)。
 */
export default function WordCapture({ children }: { children: ReactNode }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [wordInput, setWordInput] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onSelectionChange = () => {
      const area = areaRef.current;
      const selection = window.getSelection();
      if (!area || !selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!area.contains(range.commonAncestorContainer)) return;

      const word = toHeadword(range.toString());
      if (!word) return;

      // 段落(p)の中で選んだときは、その段落の中だけで文を切る。段落をまたぐ選択は無視する
      const common = range.commonAncestorContainer;
      const anchor = common instanceof Element ? common : common.parentElement;
      const block = anchor?.closest("p") ?? area;
      if (!block.contains(range.startContainer) || !block.contains(range.endContainer)) return;

      const before = document.createRange();
      before.selectNodeContents(block);
      before.setEnd(range.startContainer, range.startOffset);
      const start = before.toString().length;
      const sentence = sentenceAround(block.textContent ?? "", start, start + range.toString().length);

      setPending({ word, sentence });
      setWordInput(word);
      setNotice(null);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const save = async () => {
    if (!pending) return;
    const word = toHeadword(wordInput);
    if (!word) {
      setNotice({ ok: false, text: "英単語1語を入力してください" });
      return;
    }
    setSaving(true);
    try {
      const result = await registerReadingWord(word, pending.sentence);
      setNotice(
        result.added
          ? { ok: true, text: `「${result.word.word}」を単語帳に追加しました` }
          : { ok: true, text: `「${result.word.word}」はすでに単語帳にあります` },
      );
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : "登録に失敗しました" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div ref={areaRef}>{children}</div>
      {pending && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-white px-4 py-3 shadow-lg">
          <div className="max-w-[840px] mx-auto flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-600">単語帳に追加</span>
            <input
              aria-label="単語"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              className="border border-slate-300 rounded px-3 py-2 text-sm w-40"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-sm font-semibold text-white bg-[#16233d] rounded px-4 py-2 hover:bg-[#23365c] disabled:opacity-50 transition-colors"
            >
              {saving ? "追加中…" : "追加"}
            </button>
            {notice && (
              <span className={`text-sm ${notice.ok ? "text-[#6a8a3e]" : "text-[#c0392b]"}`}>{notice.text}</span>
            )}
            <button
              type="button"
              onClick={() => setPending(null)}
              className="ml-auto text-sm text-slate-500 hover:text-slate-900"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
