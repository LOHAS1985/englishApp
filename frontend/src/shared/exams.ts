/** 目標試験ごとのメニュー。ホームで試験を選んだあと、パート(形式)を選ぶ */
export type Exam = "toeic" | "eiken";

export interface ExamMenuItem {
  label: string;
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
  color: string;
  sections: ExamMenuSection[];
}

export const EXAM_MENUS: ExamMenu[] = [
  {
    exam: "toeic",
    title: "TOEIC",
    color: "bg-gradient-to-br from-[#a1c4fd] to-[#c2e9fb]",
    sections: [
      {
        skill: "リスニング",
        icon: "🎧",
        items: [
          { label: "Part 2 応答問題", path: "/listening?type=toeic-part2" },
          { label: "Part 3 会話問題", path: "/listening?type=toeic-part3" },
          { label: "Part 4 説明文問題", path: "/listening?type=toeic-part4" },
        ],
      },
      {
        skill: "リーディング",
        icon: "📖",
        items: [
          { label: "Part 5 短文穴埋め", path: "/grammar" },
          { label: "Part 6 長文穴埋め", path: "/reading/practice?type=toeic-part6" },
          { label: "Part 7 読解", path: "/reading/practice?type=toeic-part7" },
        ],
      },
      {
        skill: "模試",
        icon: "📝",
        items: [
          { label: "模試", path: "/mock" },
        ],
      },
    ],
  },
  {
    exam: "eiken",
    title: "英検",
    color: "bg-gradient-to-br from-[#f6d365] to-[#fda085]",
    sections: [
      {
        skill: "リーディング(一次)",
        icon: "📖",
        items: [
          { label: "大問1 語彙", path: "/vocab" },
          { label: "大問2 空所補充", path: "/reading/practice?type=eiken-cloze" },
          { label: "大問3 内容一致", path: "/reading/practice?type=eiken-long" },
        ],
      },
      {
        skill: "ライティング(一次)",
        icon: "✍️",
        items: [
          { label: "要約(60〜70語)", path: "/writing?type=summary" },
          { label: "意見論述(120〜150語)", path: "/writing?type=opinion" },
        ],
      },
      {
        skill: "リスニング(一次)",
        icon: "🎧",
        items: [
          { label: "Part 1 会話", path: "/listening?type=eiken-part1" },
          { label: "Part 2 説明文", path: "/listening?type=eiken-part2" },
          { label: "Part 3 Real-Life", path: "/listening?type=eiken-part3" },
        ],
      },
      {
        skill: "スピーキング(二次)",
        icon: "🗣️",
        items: [{ label: "面接練習", path: "/speaking" }],
      },
    ],
  },
];

/** 学習ログの形式(type)の表示名 */
export const TYPE_LABELS: Record<string, string> = {
  "toeic-part2": "TOEIC Part 2",
  "toeic-part3": "TOEIC Part 3",
  "toeic-part4": "TOEIC Part 4",
  "toeic-part5": "TOEIC Part 5",
  "toeic-part6": "TOEIC Part 6",
  "toeic-part7": "TOEIC Part 7",
  "toeic-mock": "TOEIC 模試",
  "wordbook-choice": "単語帳 4択",
  "wordbook-fill": "単語帳 穴埋め",
  vocab: "語彙(英検 大問1)",
  "eiken-cloze": "英検 大問2",
  "eiken-long": "英検 大問3",
  "eiken-summary": "英検 要約",
  "eiken-opinion": "英検 意見論述",
  "eiken-part1": "英検 リスニング Part 1",
  "eiken-part2": "英検 リスニング Part 2",
  "eiken-part3": "英検 リスニング Part 3",
  "eiken-interview": "英検 二次面接",
  "eiken-interview-part": "英検 二次面接(AI採点)",
  // Guardian 記事の多読は廃止したが、過去の学習ログの形式名として表示するために残す
  guardian: "Guardian 記事(終了)",
};

export const SKILL_LABELS = {
  listening: "リスニング",
  reading: "リーディング",
  writing: "ライティング",
  speaking: "スピーキング",
  vocab: "語彙",
} as const;

/** 技能ごとの色(MyPage のグラフ用) */
export const SKILL_COLORS = {
  listening: "bg-[#5b9a3c]",
  reading: "bg-[#2463a8]",
  writing: "bg-[#e07b39]",
  speaking: "bg-[#b0569b]",
  vocab: "bg-[#c9a227]",
} as const;
