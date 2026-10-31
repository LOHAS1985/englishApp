/** 目標試験ごとのメニュー。ホームで試験を選んだあと、パート(形式)を選ぶ */
export type Exam = "toeic" | "eiken";

export const EXAM_LABELS: Record<Exam, string> = {
  toeic: "TOEIC L&R",
  eiken: "英検準1級",
};

/** 問題の形式(type)から試験を判定する。形式名は "toeic-" / "eiken-" で始まる */
export function examOf(type: string): Exam | null {
  if (type.startsWith("toeic-")) return "toeic";
  if (type.startsWith("eiken-")) return "eiken";
  return null;
}

export interface ExamMenuItem {
  label: string;
  note: string;
  path: string;
}

export interface ExamMenuSection {
  skill: string;
  icon: string;
  items: ExamMenuItem[];
}

export interface ExamMenu {
  exam: Exam;
  title: string;
  goal: string;
  color: string;
  sections: ExamMenuSection[];
}

export const EXAM_MENUS: ExamMenu[] = [
  {
    exam: "toeic",
    title: "TOEIC L&R",
    goal: "目標 930点(L 475 / R 455)",
    color: "bg-gradient-to-br from-[#a1c4fd] to-[#c2e9fb]",
    sections: [
      {
        skill: "リスニング",
        icon: "🎧",
        items: [
          { label: "Part 2 応答問題", note: "問いかけと3つの応答を聞いて選ぶ", path: "/listening?type=toeic-part2" },
          { label: "Part 3 会話問題", note: "2〜3人の会話+設問3問", path: "/listening?type=toeic-part3" },
          { label: "Part 4 説明文問題", note: "アナウンス・電話メッセージ+設問3問", path: "/listening?type=toeic-part4" },
        ],
      },
      {
        skill: "リーディング",
        icon: "📖",
        items: [
          { label: "Part 5 短文穴埋め", note: "文法・語法の4択", path: "/grammar" },
          { label: "Part 6 長文穴埋め", note: "メール・告知の空所4問", path: "/reading/practice?type=toeic-part6" },
          { label: "Part 7 読解", note: "メール・広告・記事の設問", path: "/reading/practice?type=toeic-part7" },
          { label: "語彙", note: "ビジネス語彙・句動詞を含む4択", path: "/vocab" },
        ],
      },
    ],
  },
  {
    exam: "eiken",
    title: "英検準1級",
    goal: "一次・二次とも合格",
    color: "bg-gradient-to-br from-[#f6d365] to-[#fda085]",
    sections: [
      {
        skill: "リーディング(一次)",
        icon: "📖",
        items: [
          { label: "大問1 語彙", note: "短文の空所に入る語句を選ぶ", path: "/vocab" },
          { label: "大問2 空所補充", note: "説明文の空所3問", path: "/reading/practice?type=eiken-cloze" },
          { label: "大問3 内容一致", note: "長文の内容に合うものを選ぶ", path: "/reading/practice?type=eiken-long" },
        ],
      },
      {
        skill: "ライティング(一次)",
        icon: "✍️",
        items: [
          { label: "要約(60〜70語)", note: "AI が4観点16点満点で採点", path: "/writing?type=summary" },
          { label: "意見論述(120〜150語)", note: "AI が4観点16点満点で採点", path: "/writing?type=opinion" },
        ],
      },
      {
        skill: "リスニング(一次)",
        icon: "🎧",
        items: [
          { label: "Part 1 会話", note: "会話を聞いて設問1問", path: "/listening?type=eiken-part1" },
          { label: "Part 2 説明文", note: "説明文を聞いて設問2問", path: "/listening?type=eiken-part2" },
          { label: "Part 3 Real-Life", note: "状況を読んでから放送を聞く", path: "/listening?type=eiken-part3" },
        ],
      },
      {
        skill: "スピーキング(二次)",
        icon: "🗣️",
        items: [{ label: "面接練習", note: "ナレーション+Q&A を録音して模範解答と比べる", path: "/speaking" }],
      },
    ],
  },
];
