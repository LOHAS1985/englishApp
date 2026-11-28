import pointRules from "./pointRules.json";

interface PointRule {
  keyword: string;
  chapter: string | null;
}

const RULES = pointRules.rules as PointRule[];

/**
 * 問題の point(文法項目。例:「関係代名詞(前置詞+which)」)に対応する教科書の章の ID。
 * 語彙の問題など、教科書の範囲外は null(リンクを出さない)。規則は pointRules.json。
 */
export function chapterOf(point: string | null | undefined): string | null {
  if (!point) return null;
  return RULES.find((r) => point.includes(r.keyword))?.chapter ?? null;
}

/** 教科書の章へのパス。point を付けると、章の中の該当する節を開く */
export function bookPath(chapterId: string, point?: string | null): string {
  return `/grammar-book/${chapterId}${point ? `?point=${encodeURIComponent(point)}` : ""}`;
}

/** 弱点分析の文法の分野(QuestionTags.grammarCategory)に対応する章。語彙・コロケーションとその他は null */
const CATEGORY_CHAPTERS: Record<string, string | null> = {
  仮定法: "mood",
  倒置: "inversion",
  "品詞・語形": "parts-of-speech",
  関係詞: "relative",
  前置詞と接続詞の区別: "conjunction",
  "動詞の形・語法": "verb",
  "準動詞(不定詞・動名詞・分詞)": "infinitive",
  時制: "tense",
  比較: "comparison",
  接続詞: "conjunction",
  前置詞: "preposition",
  "代名詞・数量詞": "pronoun",
};

export function chapterOfCategory(category: string): string | null {
  return CATEGORY_CHAPTERS[category] ?? null;
}
