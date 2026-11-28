import { Link } from "react-router-dom";
import { CHAPTERS } from "../../content/grammarBook/chapters";
import Header from "../../shared/components/Header";
import { loadProgress } from "./bookProgress";
import { hasChapter } from "./loadChapter";

/** 文法の教科書の目次。章ごとに、読了と確認問題の最高得点を出す */
export default function GrammarBook() {
  const progress = loadProgress();
  const readCount = CHAPTERS.filter((c) => progress[c.id]?.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-[48rem] px-4 py-8 sm:px-6">
        <Link to="/" className="text-sm text-[#2463a8] hover:underline">
          ← ホーム
        </Link>
        <h1 className="mt-4 font-serif text-2xl text-slate-900">文法の教科書</h1>
        <p className="mt-2 text-xs text-slate-500">
          読了 {readCount} / {CHAPTERS.length}章
        </p>

        <ol className="mt-5 space-y-2">
          {CHAPTERS.map((c) => {
            const p = progress[c.id];
            const ready = hasChapter(c.id);
            const body = (
              <>
                <span className="w-7 shrink-0 font-mono text-sm text-slate-400">{c.no}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-slate-900">{c.title}</span>
                  <span className="block text-xs text-slate-500">{ready ? c.description : "準備中"}</span>
                </span>
                {p?.quizBest !== undefined && p.quizTotal !== undefined && (
                  <span className="shrink-0 text-xs text-slate-500">
                    確認問題 {p.quizBest}/{p.quizTotal}
                  </span>
                )}
                {p?.bookmark && (
                  <span className="shrink-0 text-xs text-slate-500">
                    しおり {p.bookmark.page + 1}/{p.bookmark.total}
                  </span>
                )}
                {p?.read && <span className="shrink-0 text-xs font-semibold text-[#6a8a3e]">✓ 読了</span>}
              </>
            );
            return (
              <li key={c.id}>
                {ready ? (
                  <Link
                    to={`/grammar-book/${c.id}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 opacity-60">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
