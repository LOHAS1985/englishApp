import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CHAPTERS, chapterById } from "../../content/grammarBook/chapters";
import type { Chapter } from "../../content/grammarBook/types";
import Header from "../../shared/components/Header";
import { SectionView } from "./BookParts";
import ChapterQuiz from "./ChapterQuiz";
import { loadProgress, setRead } from "./bookProgress";
import { loadChapter } from "./loadChapter";
import RichText, { Inline } from "./RichText";
import { sectionForPoint } from "./sectionFor";

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView?.({ block: "start" });

/** 文法の教科書の1章。本文(節 → 項目 → 例文)、まとめ、確認問題の順に出す */
export default function GrammarBookChapter() {
  const { chapterId = "" } = useParams();
  const [searchParams] = useSearchParams();
  // 問題の解答後のリンクは ?point=(文法項目)を付ける。該当する節へ移動して目立たせる
  const point = searchParams.get("point");
  const info = chapterById(chapterId);

  // loaded.chapter が null なら、まだ書かれていない章。loaded が別の章のものなら、読み込み中
  const [loaded, setLoaded] = useState<{ id: string; chapter: Chapter | null } | null>(null);
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    let alive = true;
    void loadChapter(chapterId).then((chapter) => {
      if (alive) setLoaded({ id: chapterId, chapter });
    });
    return () => {
      alive = false;
    };
  }, [chapterId]);

  const chapter = loaded?.id === chapterId ? loaded.chapter : undefined;
  const highlightId = chapter ? sectionForPoint(chapter, point) : null;

  useEffect(() => {
    if (highlightId) scrollToId(`sec-${highlightId}`);
    else window.scrollTo?.(0, 0);
  }, [chapter, highlightId]);

  const index = CHAPTERS.findIndex((c) => c.id === chapterId);
  const prev = index > 0 ? CHAPTERS[index - 1] : null;
  const next = index >= 0 && index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : null;
  const read = progress[chapterId]?.read === true;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-[48rem] px-4 py-8 sm:px-6">
        <Link to="/grammar-book" className="text-sm text-[#2463a8] hover:underline">
          ← 文法の教科書(目次)
        </Link>

        {!info && <p className="mt-6 text-sm text-slate-600">この章は見つかりません。</p>}

        {info && chapter === undefined && <p className="mt-6 text-sm text-slate-400">読み込み中…</p>}

        {info && chapter === null && (
          <div className="mt-6">
            <h1 className="font-serif text-2xl text-slate-900">
              第{info.no}章 {info.title}
            </h1>
            <p className="mt-3 text-sm text-slate-600">この章は準備中です。</p>
          </div>
        )}

        {info && chapter && (
          <>
            <h1 className="mt-4 font-serif text-2xl text-slate-900">
              第{chapter.no}章 {chapter.title}
            </h1>
            <RichText text={chapter.lead} className="mt-3 text-sm text-slate-700" />

            <nav aria-label="この章の目次" className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-semibold text-slate-500">この章の目次</p>
              <ol className="space-y-1 text-sm">
                {chapter.sections.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollToId(`sec-${s.id}`)}
                      className="text-left text-[#2463a8] hover:underline"
                    >
                      {i + 1}. {s.title}
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={() => scrollToId("book-summary")} className="text-left text-[#2463a8] hover:underline">
                    この章のまとめ
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToId("book-quiz")} className="text-left text-[#2463a8] hover:underline">
                    確認問題({chapter.quiz.length}問)
                  </button>
                </li>
              </ol>
            </nav>

            <div className="mt-8 space-y-10">
              {chapter.sections.map((s) => (
                <SectionView key={s.id} section={s} highlight={s.id === highlightId} />
              ))}
            </div>

            <section id="book-summary" className="mt-10 scroll-mt-4 rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-serif text-xl text-slate-900">この章のまとめ</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
                {chapter.summary.map((s, i) => (
                  <li key={i}>
                    <Inline text={s} />
                  </li>
                ))}
              </ul>
            </section>

            <section id="book-quiz" className="mt-10 scroll-mt-4">
              <h2 className="font-serif text-xl text-slate-900">確認問題</h2>
              <p className="mb-4 mt-1 text-sm text-slate-600">
                この章の内容を確かめる{chapter.quiz.length}問です。答えるとすぐに解説が出ます。
              </p>
              <ChapterQuiz chapterId={chapter.id} questions={chapter.quiz} />
            </section>

            {chapter.related && chapter.related.length > 0 && (
              <p className="mt-8 text-sm text-slate-600">
                関連する章:{" "}
                {chapter.related.map((id, i) => (
                  <span key={id}>
                    {i > 0 && "、"}
                    <Link to={`/grammar-book/${id}`} className="text-[#2463a8] hover:underline">
                      {chapterById(id)?.title ?? id}
                    </Link>
                  </span>
                ))}
              </p>
            )}

            <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
              <button
                type="button"
                aria-pressed={read}
                onClick={() => setProgress(setRead(chapter.id, !read))}
                className={`rounded border px-4 py-2 text-sm font-semibold transition-colors ${
                  read
                    ? "border-[#8fae4e] bg-[#8fae4e] text-[#0f1724]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {read ? "✓ 読み終えた" : "この章を読み終えた"}
              </button>
            </div>
          </>
        )}

        <div className="mt-8 flex justify-between gap-4 text-sm">
          {prev ? (
            <Link to={`/grammar-book/${prev.id}`} className="text-[#2463a8] hover:underline">
              ← 第{prev.no}章 {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/grammar-book/${next.id}`} className="text-right text-[#2463a8] hover:underline">
              第{next.no}章 {next.title} →
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
