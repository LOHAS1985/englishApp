import type { Skill, StatsSummary, StudyTotals } from "../api/client";

/**
 * 今日の30分メニュー。学習ログの集計(GET /api/stats/summary)から、4技能+語彙の5〜10分の課題を
 * 組み合わせて当日のメニューを作る。学習量が少ない技能・正答率が低い技能を優先する。
 * 画面はサーバーを待たず、この関数だけで組み立てる(CLAUDE.md「問題の表示はサーバーを待たない」)。
 */

/** 1日の学習時間の目標(分) */
export const MENU_MINUTES = 30;

/** 1課題が5〜10分なので、30分を少し超えるのは許す。ここを超える課題は入れない */
const MENU_MAX_MINUTES = 35;

/** 5技能に均等に配ったときの、1週間の学習秒数の目安(30分 × 7日 ÷ 5技能) */
const WEEK_TARGET_SECONDS = (MENU_MINUTES * 60 * 7) / 5;

/** 正答率を弱点の判断に使うのは、ある程度解いた形式・技能だけ(1〜2問で決めつけない) */
const MIN_QUESTIONS_FOR_ACCURACY = 5;

/** 今日この秒数以上学習した技能は、メニューを作るときの順位を下げる(もう今日の分を済ませているため) */
const SKILL_DONE_TODAY_SECONDS = 5 * 60;

/** 課題の時間のこの割合以上、今日その技能を学習したら、課題を済ませた扱いにする */
const TASK_DONE_RATIO = 0.7;

/** 技能の順位の重み。学習量の不足を、正答率の低さより重くみる(4技能を均等に回すため) */
const SHORTFALL_WEIGHT = 0.6;
const WEAKNESS_WEIGHT = 0.4;

interface TaskDef {
  skill: Skill;
  /** 学習ログの形式(item_type)。形式別の成績・解いた回数を引くのに使う */
  type: string;
  label: string;
  /** 量の目安(例: 3セット) */
  amount: string;
  /** 解答と解説を読む時間を含めた目安(分) */
  minutes: number;
  path: string;
}

/** 課題の一覧。1セットを解く時間の見積もりから、1課題が5〜10分前後になる量にしてある */
const CATALOG: TaskDef[] = [
  { skill: "listening", type: "toeic-part2", label: "TOEIC Part 2 応答問題", amount: "4セット", minutes: 8, path: "/listening?type=toeic-part2" },
  { skill: "listening", type: "toeic-part3", label: "TOEIC Part 3 会話問題", amount: "3セット", minutes: 8, path: "/listening?type=toeic-part3" },
  { skill: "listening", type: "toeic-part4", label: "TOEIC Part 4 説明文問題", amount: "3セット", minutes: 8, path: "/listening?type=toeic-part4" },
  { skill: "listening", type: "eiken-part1", label: "英検 リスニング Part 1", amount: "6セット", minutes: 7, path: "/listening?type=eiken-part1" },
  { skill: "listening", type: "eiken-part2", label: "英検 リスニング Part 2", amount: "4セット", minutes: 8, path: "/listening?type=eiken-part2" },
  { skill: "listening", type: "eiken-part3", label: "英検 リスニング Part 3", amount: "6セット", minutes: 7, path: "/listening?type=eiken-part3" },
  { skill: "reading", type: "toeic-part5", label: "TOEIC Part 5 短文穴埋め", amount: "10問", minutes: 7, path: "/grammar" },
  { skill: "reading", type: "toeic-part6", label: "TOEIC Part 6 長文穴埋め", amount: "3セット", minutes: 8, path: "/reading/practice?type=toeic-part6" },
  { skill: "reading", type: "toeic-part7", label: "TOEIC Part 7 読解", amount: "2セット", minutes: 9, path: "/reading/practice?type=toeic-part7" },
  { skill: "reading", type: "eiken-cloze", label: "英検 大問2 空所補充", amount: "2セット", minutes: 10, path: "/reading/practice?type=eiken-cloze" },
  { skill: "reading", type: "eiken-long", label: "英検 大問3 内容一致", amount: "1セット", minutes: 8, path: "/reading/practice?type=eiken-long" },
  { skill: "vocab", type: "vocab", label: "語彙(英検 大問1・TOEIC)", amount: "10問", minutes: 6, path: "/vocab" },
  { skill: "writing", type: "eiken-summary", label: "英検 要約(60〜70語)", amount: "1題", minutes: 10, path: "/writing?type=summary" },
  { skill: "writing", type: "eiken-opinion", label: "英検 意見論述(120〜150語)", amount: "1題", minutes: 15, path: "/writing?type=opinion" },
  { skill: "speaking", type: "eiken-interview", label: "英検 面接練習", amount: "1セット", minutes: 8, path: "/speaking" },
];

/** 同じ順位のとき(最初の日など)の並び。技能が決まった順に出るようにする */
const SKILL_ORDER: Skill[] = ["listening", "reading", "speaking", "writing", "vocab"];

const SKILL_NAMES: Record<Skill, string> = {
  listening: "リスニング",
  reading: "リーディング",
  writing: "ライティング",
  speaking: "スピーキング",
  vocab: "語彙",
};

export interface MenuTask {
  /** 例: "listening:toeic-part3" / "review:vocab" */
  id: string;
  skill: Skill;
  label: string;
  /** 量と時間の目安(例: 3セット・約8分) */
  note: string;
  minutes: number;
  path: string;
  /** なぜこの課題が選ばれたか */
  reason: string;
  /** 今日すでにこの課題を済ませた(技能ごとの今日の学習時間から判断する) */
  done: boolean;
  /** 間違えた問題の復習か */
  review: boolean;
}

/** 1日分の課題の並び */
export interface MenuPlan {
  tasks: MenuTask[];
  /** 課題の時間の合計(分) */
  totalMinutes: number;
}

export interface TodayMenu {
  /** メニューを作った日(todaySeed の値)。この日のうちは同じメニューを使う */
  seed: number;
  /** 通常のメニュー */
  normal: MenuPlan;
  /** スピーキングなしのメニュー(電車内など、声を出せないとき用) */
  quiet: MenuPlan;
  /**
   * 最後に取得した、今日の学習時間(分)。保存したメニューを、サーバーの応答を待たずに出すとき、
   * 進み具合の表示にも使う(応答が返ったら、最新の値に更新する)
   */
  todayMinutes?: number;
}

/** 声を出せない場所でも続けられるよう、スピーキングを除いたメニューを同時に作る */
const QUIET_EXCLUDED_SKILLS: Skill[] = ["speaking"];

const ZERO: StudyTotals = { sessions: 0, seconds: 0, correct: 0, total: 0 };

/** 正答率(0〜1)。判断できるだけ解いていなければ null */
function accuracyOf(t: StudyTotals): number | null {
  return t.total >= MIN_QUESTIONS_FOR_ACCURACY ? t.correct / t.total : null;
}

const percent = (rate: number) => Math.round(rate * 100);

/** 正答率が分からないもの(ライティング・スピーキングなど)は、中間の弱さとして扱う */
const weaknessOf = (accuracy: number | null) => (accuracy === null ? 0.5 : 1 - accuracy);

function todaySeconds(summary: StatsSummary, skill: Skill): number {
  return summary.daily.at(-1)?.seconds[skill] ?? 0;
}

interface SkillScore {
  skill: Skill;
  score: number;
  weekSeconds: number;
}

function scoreSkills(summary: StatsSummary): SkillScore[] {
  return SKILL_ORDER.map((skill) => {
    const stats = summary.skills.find((s) => s.skill === skill);
    const week = stats?.week ?? ZERO;
    const shortfall = Math.min(1, Math.max(0, 1 - week.seconds / WEEK_TARGET_SECONDS));
    const weakness = weaknessOf(accuracyOf(stats?.month ?? ZERO));
    const doneToday = todaySeconds(summary, skill) >= SKILL_DONE_TODAY_SECONDS;
    return {
      skill,
      score: SHORTFALL_WEIGHT * shortfall + WEAKNESS_WEIGHT * weakness - (doneToday ? 1 : 0),
      weekSeconds: week.seconds,
    };
  });
}

/** 技能の中で、今日解く形式を選ぶ。正答率が低い形式と、まだ解いていない形式を優先し、同点なら日替わりで回す */
function pickTask(skill: Skill, summary: StatsSummary, seed: number): { def: TaskDef; reason: string } | null {
  const defs = CATALOG.filter((d) => d.skill === skill);
  const scored = defs.map((def, index) => {
    const month = summary.types.find((t) => t.type === def.type)?.month ?? ZERO;
    const accuracy = accuracyOf(month);
    const novelty = 1 - Math.min(1, month.sessions / 5);
    return {
      def,
      month,
      accuracy,
      score: 0.5 * weaknessOf(accuracy) + 0.5 * novelty,
      rotation: (index + seed) % defs.length,
    };
  });
  scored.sort((a, b) => b.score - a.score || a.rotation - b.rotation);
  const best = scored[0];
  if (!best) return null;
  let reason = "バランスよく回すため";
  if (best.month.sessions === 0) reason = "この1か月まだ解いていない形式";
  else if (best.accuracy !== null && best.accuracy < 0.7) reason = `この形式の正答率が低い(${percent(best.accuracy)}%)`;
  return { def: best.def, reason };
}

const reviewMinutes = (due: number) => Math.min(8, Math.max(3, Math.round(due * 0.7)));

/** 今日学習した時間から、課題が済んだかを判断する。復習は、復習日になっている問題がなくなったら済み */
export function markDone(tasks: MenuTask[], summary: StatsSummary): MenuTask[] {
  return tasks.map((t) => {
    if (t.review) {
      const feature = t.id.replace("review:", "");
      return { ...t, done: (summary.review[feature]?.due ?? 0) <= 0 };
    }
    return { ...t, done: todaySeconds(summary, t.skill) >= t.minutes * 60 * TASK_DONE_RATIO };
  });
}

function buildPlan(summary: StatsSummary, seed: number, excluded: Skill[]): MenuPlan {
  const tasks: MenuTask[] = [];
  let total = 0;

  // 間違えた問題の復習(間隔反復の復習日になったもの)を最初に入れる
  const reviews: { feature: "vocab" | "grammar"; label: string; skill: Skill; path: string }[] = [
    { feature: "vocab", label: "語彙の復習", skill: "vocab", path: "/vocab?review=1" },
    { feature: "grammar", label: "文法の復習", skill: "reading", path: "/grammar?review=1" },
  ];
  for (const r of reviews) {
    const due = summary.review[r.feature]?.due ?? 0;
    if (due <= 0) continue;
    const minutes = reviewMinutes(due);
    tasks.push({
      id: `review:${r.feature}`,
      skill: r.skill,
      label: r.label,
      note: `${due}問・約${minutes}分`,
      minutes,
      path: r.path,
      reason: "間違えた問題を復習する日です",
      done: false,
      review: true,
    });
    total += minutes;
  }

  const ranked = scoreSkills(summary)
    .filter((s) => !excluded.includes(s.skill))
    .sort((a, b) => b.score - a.score);
  for (const s of ranked) {
    if (total >= MENU_MINUTES) break;
    const picked = pickTask(s.skill, summary, seed);
    if (!picked || total + picked.def.minutes > MENU_MAX_MINUTES) continue;
    const { def } = picked;
    const reason =
      s.weekSeconds < WEEK_TARGET_SECONDS * 0.5
        ? `今週の${SKILL_NAMES[s.skill]}の学習が少ない`
        : picked.reason;
    tasks.push({
      id: `${def.skill}:${def.type}`,
      skill: def.skill,
      label: def.label,
      note: `${def.amount}・約${def.minutes}分`,
      minutes: def.minutes,
      path: def.path,
      reason,
      done: false,
      review: false,
    });
    total += def.minutes;
  }

  return { tasks: markDone(tasks, summary), totalMinutes: total };
}

/**
 * 今日の30分メニューを作る(通常と、スピーキングなしの2つ)。
 * seed は日替わりの値(todaySeed。同じ順位の形式を回すために使う)
 */
export function buildTodayMenu(summary: StatsSummary, seed: number): TodayMenu {
  return {
    seed,
    normal: buildPlan(summary, seed, []),
    quiet: buildPlan(summary, seed, QUIET_EXCLUDED_SKILLS),
  };
}

/** 保存したメニューの済みの印を、今日の学習時間に合わせて付け直す */
export function refreshDone(menu: TodayMenu, summary: StatsSummary): TodayMenu {
  return {
    ...menu,
    normal: { ...menu.normal, tasks: markDone(menu.normal.tasks, summary) },
    quiet: { ...menu.quiet, tasks: markDone(menu.quiet.tasks, summary) },
  };
}

/** 日替わりの値(日本時間の日付ごとに1つ増える) */
export function todaySeed(now: number = Date.now()): number {
  return Math.floor((now + 9 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));
}

const MENU_KEY = "englishApp.todayMenu";

/** この日のうちは同じメニューを出す(課題を済ませるたびに入れ替わると、何をやったか分からなくなるため) */
export function loadSavedMenu(seed: number): TodayMenu | null {
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (!raw) return null;
    const menu = JSON.parse(raw) as TodayMenu;
    const valid = Array.isArray(menu.normal?.tasks) && Array.isArray(menu.quiet?.tasks);
    return menu.seed === seed && valid ? menu : null;
  } catch {
    return null;
  }
}

export function saveMenu(menu: TodayMenu) {
  try {
    localStorage.setItem(MENU_KEY, JSON.stringify(menu));
  } catch {
    // 保存できなくても、今回のメニューはそのまま表示する
  }
}
