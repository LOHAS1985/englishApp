import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CHAPTERS, chapterById } from "../../content/grammarBook/chapters";
import type { Chapter } from "../../content/grammarBook/types";
import Header from "../../shared/components/Header";
import { SectionPage } from "./BookParts";
import ChapterQuiz from "./ChapterQuiz";
import { loadProgress, setRead, toggleBookmark } from "./bookProgress";
import { loadChapter } from "./loadChapter";
import { ITEMS_PER_PAGE, buildPages, firstPageOfSection, itemsOnPage, startPage } from "./pages";
import RichText, { Inline } from "./RichText";
import { sectionForPoint } from "./sectionFor";

/** 文法の教科書の1章。ページごとに読む(導入 → 節ごとのページ → まとめ・確認問題)。しおりで読んだところを残せる */
export default function GrammarBookChapter() {
  const { chapterId = "" } = useParams();
  const [searchParams] = useSearchParams();
  // 問題の解答後のリンクは ?point=(文法項目)を付ける。該当する節のページから開く
  const point = searchParams.get("point");
  const info = chapterById(chapterId);

  // loaded.chapter が null なら、まだ書かれていない章。loaded が別の章のものなら、読み込み中
  const [loaded, setLoaded] = useState<{ id: string; chapter: Chapter | null } | null>(null);
  const [progress, setProgress] = useState(loadProgress);
  // 画面で移動したページ。開いたときは startPage(解答後のリンク → しおり → 導入)で決める
  const [moved, setMoved] = useState<{ chapterId: string; index: number } | null>(null);

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

  if (!info) {
    return <Shell><p className="mt-6 text-sm text-slate-600">この章は見つかりません。</p></Shell>;
  }
  if (chapter === undefined) {
    return <Shell><p className="mt-6 text-sm text-slate-400">読み込み中…</p></Shell>;
  }
  if (chapter === null) {
    return (
      <Shell>
        <h1 className="mt-4 font-serif text-2xl text-slate-900">
          第{info.no}章 {info.title}
        </h1>
        <p className="mt-3 text-sm text-slate-600">この章は準備中です。</p>
      </Shell>
    );
  }

  return <ChapterReader chapter={chapter} point={point} progress={progress} setProgress={setProgress} moved={moved} setMoved={setMoved} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-[48rem] px-4 py-8 sm:px-6">
        <Link to="/grammar-book" className="text-sm text-[#2463a8] hover:underline">
          ← 文法の教科書(目次)
        </Link>
        {children}
      </main>
    </div>
  );
}

function ChapterReader({
  chapter,
  point,
  progress,
  setProgress,
  moved,
  setMoved,
}: {
  chapter: Chapter;
  point: string | null;
  progress: ReturnType<typeof loadProgress>;
  setProgress: (p: ReturnType<typeof loadProgress>) => void;
  moved: { chapterId: string; index: number } | null;
  setMoved: (m: { chapterId: string; index: number }) => void;
}) {
  const pages = buildPages(chapter);
  const highlightId = sectionForPoint(chapter, point);
  const highlightIndex = highlightId === null ? null : chapter.sections.findIndex((s) => s.id === highlightId);
  const bookmark = progress[chapter.id]?.bookmark;
  const read = progress[chapter.id]?.read === true;

  const start = startPage(pages, highlightIndex === -1 ? null : highlightIndex, bookmark?.page ?? null);
  const current = Math.min(
    moved?.chapterId === chapter.id ? moved.index : start,
    pages.length - 1,
  );
  const page = pages[current];

  const goTo = (index: number) => {
    setMoved({ chapterId: chapter.id, index: Math.min(Math.max(index, 0), pages.length - 1) });
    window.scrollTo?.(0, 0);
  };

  const endIndex = pages.length - 1;
  const index = CHAPTERS.findIndex((c) => c.id === chapter.id);
  const prevChapter = index > 0 ? CHAPTERS[index - 1] : null;
  const nextChapter = index >= 0 && index < CHAPTERS.length - 1 ? CHAPTERS[index + 1] : null;
  const isBookmarked = bookmark?.page === current;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-[48rem] px-4 py-8 sm:px-6">
        <Link to="/grammar-book" className="text-sm text-[#2463a8] hover:underline">
          ← 文法の教科書(目次)
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl text-slate-900">
            第{chapter.no}章 {chapter.title}
          </h1>
          <p className="font-mono text-sm text-slate-500" aria-label="ページ">
            {current + 1} / {pages.length}
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
          {page.kind === "intro" && (
            <div className="space-y-5">
              <RichText text={chapter.lead} className="text-sm text-slate-700" />
              <nav aria-label="この章の目次" className="rounded-md bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">この章の目次</p>
                <ol className="space-y-1 text-sm">
                  {chapter.sections.map((s, i) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => goTo(firstPageOfSection(pages, i))}
                        className="text-left text-[#2463a8] hover:underline"
                      >
                        {i + 1}. {s.title}
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" onClick={() => goTo(endIndex)} className="text-left text-[#2463a8] hover:underline">
                      まとめ・確認問題({chapter.quiz.length}問)
                    </button>
                  </li>
                </ol>
              </nav>
            </div>
          )}

          {page.kind === "section" && (
            <SectionPage
              section={chapter.sections[page.sectionIndex]}
              items={itemsOnPage(chapter.sections[page.sectionIndex], page)}
              showIntro={page.part === 0}
              showExamNote={page.part === page.parts - 1}
              continued={page.part > 0}
              startNo={page.part * ITEMS_PER_PAGE}
            />
          )}

          {page.kind === "end" && (
            <div className="space-y-8">
              <section aria-labelledby="book-summary-title">
                <h2 id="book-summary-title" className="font-serif text-xl text-slate-900">
                  この章のまとめ
                </h2>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
                  {chapter.summary.map((s, i) => (
                    <li key={i}>
                      <Inline text={s} />
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="book-quiz-title">
                <h2 id="book-quiz-title" className="font-serif text-xl text-slate-900">
                  確認問題
                </h2>
                <p className="mb-4 mt-1 text-sm text-slate-600">
                  この章の内容を確かめる{chapter.quiz.length}問です。答えるとすぐに解説が出ます。
                </p>
                <ChapterQuiz chapterId={chapter.id} questions={chapter.quiz} />
              </section>

              <div className="rounded-md border border-slate-200 p-4">
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

              {chapter.related && chapter.related.length > 0 && (
                <p className="text-sm text-slate-600">
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
            </div>
          )}
        </div>

        {/* しおり: 読んだところで押すと、このページに挟む。もう一度押すと外れる。次に開くとこのページから始まる */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setProgress(toggleBookmark(chapter.id, current, pages.length))}
            aria-pressed={isBookmarked}
            className={`rounded border px-4 py-2 text-sm font-semibold transition-colors ${
              isBookmarked
                ? "border-[#2463a8] bg-[#2463a8] text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {isBookmarked ? "✓ ここにしおりを挟んでいます" : "ここまで読んだ(しおりを挟む)"}
          </button>
          {bookmark && !isBookmarked && (
            <p className="text-xs text-slate-500">
              しおり: {bookmark.page + 1} / {bookmark.total} ページ
            </p>
          )}
        </div>

        <nav aria-label="ページ移動" className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            ← 前のページ
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current === endIndex}
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
          >
            次のページ →
          </button>
        </nav>

        {page.kind === "end" && (prevChapter || nextChapter) && (
          <div className="mt-8 flex justify-between gap-4 text-sm">
            {prevChapter ? (
              <Link to={`/grammar-book/${prevChapter.id}`} className="text-[#2463a8] hover:underline">
                ← 第{prevChapter.no}章 {prevChapter.title}
              </Link>
            ) : (
              <span />
            )}
            {nextChapter && (
              <Link to={`/grammar-book/${nextChapter.id}`} className="text-right text-[#2463a8] hover:underline">
                第{nextChapter.no}章 {nextChapter.title} →
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
