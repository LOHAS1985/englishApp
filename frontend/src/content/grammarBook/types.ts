/**
 * 文法の教科書の内容(chapters/<章の ID>.json)の型。書き方の決まりは docs/grammar-book.md。
 * 文章の中の **語** は太字にする(画面が変換する。HTML は書かない)。
 */

/** 例文。en の中の注目する語は **語** で囲む */
export interface Example {
  en: string;
  ja: string;
  /** どこがポイントか(なぜその形になるか)の一言 */
  note?: string;
}

export interface Table {
  caption?: string;
  headers: string[];
  rows: string[][];
}

/** 1つの学習項目。例文を必ず1つ以上付ける */
export interface Item {
  heading: string;
  /** 説明。段落は空行(\n\n)で区切る。行頭の「・」は箇条書きとして表示する */
  explanation: string;
  table?: Table;
  examples: Example[];
  /** 間違えやすい点 */
  cautions?: string[];
}

export interface Section {
  id: string;
  title: string;
  /** この節で何が分かるか、なぜ大事かの導入 */
  intro: string;
  /** 問題の point(文法項目)に含まれる語。解答後のリンクが、該当する節へ飛ぶために使う */
  keywords: string[];
  items: Item[];
  /** 試験(TOEIC Part 5・6、英検準1級)での出方と、ひっかけ */
  examNote?: string;
}

export interface QuizChoice {
  label: string;
  text: string;
}

/** 章末の確認問題(4択)。画面で採点し、記録はブラウザに保存する */
export interface QuizQuestion {
  id: string;
  sentence: string;
  choices: QuizChoice[];
  answer: string;
  explanation: string;
  translation?: string;
}

export interface Chapter {
  id: string;
  no: number;
  title: string;
  /** この章で学ぶこと(導入) */
  lead: string;
  sections: Section[];
  /** 章のまとめ(箇条書き) */
  summary: string[];
  quiz: QuizQuestion[];
  /** 関連する章の ID */
  related?: string[];
}
