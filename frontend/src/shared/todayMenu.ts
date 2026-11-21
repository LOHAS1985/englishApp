import type { Skill, StatsSummary, StudyTotals } from "../api/client";

/**
 * 今日の30分メニュー。学習ログの集計(GET /api/stats/summary)から、4技能+語彙の5〜10分の課題を
 * 組み合わせて当日のメニューを作る。学習量が少ない技能・正答率が低い技能を優先する。
 * 画面はサーバーを待たず、この関数だけで組み立てる(CLAUDE.md「問題の表示はサーバーを待たない」)。
 */

/** 1日の学習時間の目標(分) */
export const MENU_MINUTES = 30;

/** 合計は必ず30分を超える。課題の積み増しで40〜50分になってもよいが、ここを超える課題は入れない */
const MENU_LIMIT_MINUTES = 50;

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

/** 課題の一覧。1セットを解く時間の見積もりから、1課題が5〜10分前後になる量にしてある。amount の問数は、形式ごとに決まっている1セットの設問数から数える */
const CATALOG: TaskDef[] = [
  { skill: "listening", type: "toeic-part2", label: "TOEIC Part 2 応答問題", amount: "4セット(20問)", minutes: 8, path: "/listening?type=toeic-part2" },
  { skill: "listening", type: "toeic-part3", label: "TOEIC Part 3 会話問題", amount: "3セット(9問)", minutes: 8, path: "/listening?type=toeic-part3" },
  { skill: "listening", type: "toeic-part4", label: "TOEIC Part 4 説明文問題", amount: "3セット(9問)", minutes: 8, path: "/listening?type=toeic-part4" },
  { skill: "listening", type: "eiken-part1", label: "英検 リスニング Part 1", amount: "6セット(6問)", minutes: 7, path: "/listening?type=eiken-part1" },
  { skill: "listening", type: "eiken-part2", label: "英検 リスニング Part 2", amount: "4セット(8問)", minutes: 8, path: "/listening?type=eiken-part2" },
  { skill: "listening", type: "eiken-part3", label: "英検 リスニング Part 3", amount: "6セット(6問)", minutes: 7, path: "/listening?type=eiken-part3" },
  { skill: "reading", type: "toeic-part5", label: "TOEIC Part 5 短文穴埋め", amount: "10問", minutes: 7, path: "/grammar" },
  { skill: "reading", type: "toeic-part6", label: "TOEIC Part 6 長文穴埋め", amount: "3セット(12問)", minutes: 8, path: "/reading/practice?type=toeic-part6" },
  { skill: "reading", type: "toeic-part7", label: "TOEIC Part 7 読解", amount: "2セット(約8問)", minutes: 9, path: "/reading/practice?type=toeic-part7" },
  { skill: "reading", type: "eiken-cloze", label: "英検 大問2 空所補充", amount: "2セット(6問)", minutes: 10, path: "/reading/practice?type=eiken-cloze" },
  { skill: "reading", type: "eiken-long", label: "英検 大問3 内容一致", amount: "1セット(3問)", minutes: 8, path: "/reading/practice?type=eiken-long" },
  { skill: "writing", type: "eiken-summary", label: "英検 要約(60〜70語)", amount: "1題", minutes: 10, path: "/writing?type=summary" },
  { skill: "writing", type: "eiken-opinion", label: "英検 意見論述(120〜150語)", amount: "1題", minutes: 15, path: "/writing?type=opinion" },
  { skill: "speaking", type: "eiken-interview", label: "英検 面接練習", amount: "1セット", minutes: 8, path: "/speaking" },
];

/**
 * 単語帳の課題。語彙の枠は毎日これを入れる(技能の順位に任せると、30分に届いて入らない日が多いため)。
 * 4択と穴埋めは、正答率が低い方・この1か月解いていない方を優先し、同点は日替わりで回す
 */
const WORDBOOK_TASKS: TaskDef[] = [
  { skill: "vocab", type: "wordbook-choice", label: "単語帳 4択(英→日)", amount: "10問", minutes: 4, path: "/wordbook/quiz?type=choice" },
  { skill: "vocab", type: "wordbook-fill", label: "単語帳 穴埋め", amount: "8問", minutes: 5, path: "/wordbook/quiz?type=fill" },
];

/** 同じ順位のとき(最初の日など)の並び。技能が決まった順に出るようにする */
const SKILL_ORDER: Skill[] = ["listening", "reading", "speaking", "writing", "vocab"];

export interface MenuTask {
  /** 例: "listening:toeic-part3" / "review:vocab" */
  id: string;
  skill: Skill;
  label: string;
  /** 量と時間の目安(例: 3セット・約8分) */
  note: string;
  minutes: number;
  path: string;
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
  /**
   * 前回(前日以前)に取得した記録から作った仮のメニュー。日付が変わって最初に開いたとき、
   * サーバーの応答(眠っていると約1分)を待たずに出すために使う。応答が返ったら作り直す(保存はしない)
   */
  provisional?: boolean;
}

/** 声を出せない場所でも続けられるよう、スピーキングを除いたメニューを同時に作る */
const QUIET_EXCLUDED_SKILLS: Skill[] = ["speaking"];

const ZERO: StudyTotals = { sessions: 0, seconds: 0, correct: 0, total: 0 };

/** 正答率(0〜1)。判断できるだけ解いていなければ null */
function accuracyOf(t: StudyTotals): number | null {
  return t.total >= MIN_QUESTIONS_FOR_ACCURACY ? t.correct / t.total : null;
}

/** 正答率が分からないもの(ライティング・スピーキングなど)は、中間の弱さとして扱う */
const weaknessOf = (accuracy: number | null) => (accuracy === null ? 0.5 : 1 - accuracy);

function todaySeconds(summary: StatsSummary, skill: Skill): number {
  return summary.daily.at(-1)?.seconds[skill] ?? 0;
}

interface SkillScore {
  skill: Skill;
  score: number;
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
    };
  });
}

/** 技能の中で、今日解く形式を選ぶ。正答率が低い形式と、まだ解いていない形式を優先し、同点なら日替わりで回す */
function pickTask(defs: TaskDef[], summary: StatsSummary, seed: number): TaskDef | null {
  const scored = defs.map((def, index) => {
    const month = summary.types.find((t) => t.type === def.type)?.month ?? ZERO;
    const accuracy = accuracyOf(month);
    const novelty = 1 - Math.min(1, month.sessions / 5);
    return {
      def,
      score: 0.5 * weaknessOf(accuracy) + 0.5 * novelty,
      rotation: (index + seed) % defs.length,
    };
  });
  scored.sort((a, b) => b.score - a.score || a.rotation - b.rotation);
  return scored[0]?.def ?? null;
}

const reviewMinutes = (due: number) => Math.min(8, Math.max(3, Math.round(due * 0.7)));

/**
 * 今日学習した時間から、課題が済んだかを判断する。復習は、復習日になっている問題がなくなったら済み。
 * 技能の学習時間は、メニューの並び順に課題へ割り当てる(同じ技能の課題が2つあるとき、
 * 合計の時間だけで両方を済みにしないため。例: 読解7分で Part 5(7分)と Part 7(9分)の両方が済みになっていた)
 */
export function markDone(tasks: MenuTask[], summary: StatsSummary): MenuTask[] {
  const remaining = new Map<Skill, number>();
  const left = (skill: Skill) => remaining.get(skill) ?? todaySeconds(summary, skill);
  return tasks.map((t) => {
    const needed = t.minutes * 60 * TASK_DONE_RATIO;
    if (t.review) {
      const feature = t.id.replace("review:", "");
      const done = (summary.review[feature]?.due ?? 0) <= 0;
      // 済んだ復習にかけた時間は、同じ技能のほかの課題に回さない
      if (done) remaining.set(t.skill, Math.max(0, left(t.skill) - needed));
      return { ...t, done };
    }
    // 足りないときは時間を残す(後ろの短い課題の分かもしれないため)
    const done = left(t.skill) >= needed;
    if (done) remaining.set(t.skill, left(t.skill) - needed);
    return { ...t, done };
  });
}

function taskOf(def: TaskDef): MenuTask {
  return {
    id: `${def.skill}:${def.type}`,
    skill: def.skill,
    label: def.label,
    note: `${def.amount}・約${def.minutes}分`,
    minutes: def.minutes,
    path: def.path,
    done: false,
    review: false,
  };
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
      done: false,
      review: true,
    });
    total += minutes;
  }

  // 単語帳(語彙の枠)。復習の次に、毎日入れる
  const wordbook = pickTask(WORDBOOK_TASKS, summary, seed);
  if (wordbook && !excluded.includes("vocab")) {
    tasks.push(taskOf(wordbook));
    total += wordbook.minutes;
  }

  const ranked = scoreSkills(summary)
    // 語彙の枠は単語帳で入れ済み
    .filter((s) => !excluded.includes(s.skill) && s.skill !== "vocab")
    .sort((a, b) => b.score - a.score);

  // 合計が30分を超えるまで、技能の順位の順に1つずつ入れる。1周して足りなければ、
  // 同じ順位でもう一周し、その技能のまだ入れていない別の形式を足す(上限は MENU_LIMIT_MINUTES)
  const chosen = new Set(tasks.map((t) => t.id));
  let added = true;
  while (total <= MENU_MINUTES && added) {
    added = false;
    for (const s of ranked) {
      if (total > MENU_MINUTES) break;
      const picked = pickTask(
        CATALOG.filter((d) => d.skill === s.skill && !chosen.has(`${d.skill}:${d.type}`)),
        summary,
        seed,
      );
      if (!picked || total + picked.minutes > MENU_LIMIT_MINUTES) continue;
      tasks.push(taskOf(picked));
      chosen.add(`${picked.skill}:${picked.type}`);
      total += picked.minutes;
      added = true;
    }
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

const LAST_SUMMARY_KEY = "englishApp.lastStatsSummary";

/** 最後に取得した学習記録の集計を保存する(日付が変わった後の仮のメニューに使う) */
export function saveLastSummary(summary: StatsSummary) {
  try {
    localStorage.setItem(LAST_SUMMARY_KEY, JSON.stringify(summary));
  } catch {
    // 保存できなくても、次の日は取得を待ってから作るだけ
  }
}

function loadLastSummary(): StatsSummary | null {
  try {
    const raw = localStorage.getItem(LAST_SUMMARY_KEY);
    if (!raw) return null;
    const summary = JSON.parse(raw) as StatsSummary;
    return Array.isArray(summary.daily) && Array.isArray(summary.skills) && Array.isArray(summary.types)
      ? summary
      : null;
  } catch {
    return null;
  }
}

/** todaySeed の値から、日本時間の日付(YYYY-MM-DD) */
const seedDate = (seed: number) => new Date(seed * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * 前日以前の集計を、今日の分がまだ無い状態に読み替える。そのままだと、前回の日の学習時間で
 * 「今日もう学習した技能」「済」と判断してしまうため。週・月の合計は古いまま(仮のメニューなので許す)
 */
export function rollSummaryToDate(summary: StatsSummary, date: string): StatsSummary {
  if (summary.daily.at(-1)?.date === date) return summary;
  const zero = Object.fromEntries(SKILL_ORDER.map((s) => [s, 0])) as Record<Skill, number>;
  return {
    ...summary,
    today: ZERO,
    daily: [...summary.daily.filter((d) => d.date < date), { date, seconds: zero }],
  };
}

/** 前回取得した記録から、今日の仮のメニューを作る。記録を一度も取得していなければ null */
export function buildProvisionalMenu(seed: number): TodayMenu | null {
  const last = loadLastSummary();
  if (!last) return null;
  return { ...buildTodayMenu(rollSummaryToDate(last, seedDate(seed)), seed), todayMinutes: 0, provisional: true };
}
