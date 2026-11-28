import type { Chapter } from "../../content/grammarBook/types";

// 章ごとに別のチャンクにして、開いた章の分だけ読み込む(全24章で数百 KB になる)
const loaders = import.meta.glob<Chapter>("../../content/grammarBook/chapters/*.json", { import: "default" });

const pathOf = (id: string) => `../../content/grammarBook/chapters/${id}.json`;

/** 内容がある(書き終えた)章か。無い章は一覧で「準備中」と出す */
export const hasChapter = (id: string) => pathOf(id) in loaders;

/** 章の ID を、書けている章に限って返す(まだ書いていない章へのリンクを出さないため) */
export const writtenChapterId = (id: string | null): string | null => (id && hasChapter(id) ? id : null);

export async function loadChapter(id: string): Promise<Chapter | null> {
  const loader = loaders[pathOf(id)];
  return loader ? loader() : null;
}
