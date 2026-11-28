/** 文法の教科書の章の一覧(目次の順)。内容は chapters/<id>.json */
export interface ChapterInfo {
  id: string;
  no: number;
  title: string;
  /** 一覧に出す一言の説明 */
  description: string;
}

export const CHAPTERS: ChapterInfo[] = [
  { id: "parts-of-speech", no: 1, title: "品詞と語形", description: "語尾から品詞を見分け、空所に入る語の形を決める" },
  { id: "sentence", no: 2, title: "文", description: "文の種類と、5つの文型(SV・SVC・SVO・SVOO・SVOC)" },
  { id: "noun", no: 3, title: "名詞", description: "数えられる名詞と数えられない名詞、複数形、所有格" },
  { id: "article", no: 4, title: "冠詞", description: "a / an / the と、冠詞をつけない場合" },
  { id: "pronoun", no: 5, title: "代名詞", description: "人称・所有・再帰・指示・不定代名詞と it の用法" },
  { id: "interrogative", no: 6, title: "疑問詞", description: "疑問詞の使い分けと、間接疑問の語順" },
  { id: "adjective", no: 7, title: "形容詞", description: "限定・叙述用法、数量を表す語、感情を表す -ed / -ing" },
  { id: "adverb", no: 8, title: "副詞", description: "副詞の位置と働き、形の似た副詞の使い分け" },
  { id: "comparison", no: 9, title: "比較", description: "原級・比較級・最上級と、比較の重要表現" },
  { id: "verb", no: 10, title: "動詞", description: "自動詞・他動詞、使役・知覚動詞、動詞の語法" },
  { id: "tense", no: 11, title: "時制", description: "12の時制と、未来を表す現在形、完了形の使い分け" },
  { id: "modal", no: 12, title: "助動詞", description: "助動詞の意味と、助動詞 + have + 過去分詞" },
  { id: "infinitive", no: 13, title: "不定詞", description: "名詞的・形容詞的・副詞的用法と、不定詞をとる動詞" },
  { id: "participle", no: 14, title: "分詞", description: "分詞の修飾、感情の分詞、分詞構文" },
  { id: "gerund", no: 15, title: "動名詞", description: "動名詞をとる動詞と、前置詞 to の後の -ing" },
  { id: "mood", no: 16, title: "法", description: "仮定法過去・過去完了・倒置・要求の that 節" },
  { id: "voice", no: 17, title: "態", description: "受動態の作り方と、by 以外の前置詞をとる受動態" },
  { id: "conjunction", no: 18, title: "接続詞", description: "等位・従属接続詞、前置詞との見分け、接続副詞" },
  { id: "relative", no: 19, title: "関係詞", description: "関係代名詞・関係副詞・複合関係詞と what" },
  { id: "preposition", no: 20, title: "前置詞", description: "時・場所・原因などの前置詞と、群前置詞" },
  { id: "agreement", no: 21, title: "一致", description: "主語と動詞の数の一致、代名詞の一致" },
  { id: "sequence-narration", no: 22, title: "時制の一致と話法", description: "時制の一致の原則と例外、直接話法と間接話法" },
  { id: "inversion", no: 23, title: "倒置・省略・強調・挿入", description: "否定語の倒置、省略、強調構文、挿入" },
  { id: "transformation", no: 24, title: "文の転換", description: "意味を変えずに文の形を書き換える方法" },
];

export const chapterById = (id: string | null | undefined) => CHAPTERS.find((c) => c.id === id);
