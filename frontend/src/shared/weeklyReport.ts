import type { Skill, StatsSummary, StudyTotals } from "../api/client";
import { TYPE_LABELS } from "./exams";

/**
 * ホームの「今週の学習」。学習ログの集計(GET /api/stats/summary)から、直近7日(今日を含む)に
 * 何をどれだけ学習したか(時間・問題数)を、技能別・日別・形式別にまとめる。
 */

const SKILL_ORDER: Skill[] = ["listening", "reading", "speaking", "writing", "vocab"];

/** 正誤のない技能。問題数ではなく「題」(回数)で数える */
const UNGRADED: Skill[] = ["writing", "speaking"];

export interface WeeklyAmount {
  seconds: number;
  /** 問題数。ライティング・スピーキングは題数(回数) */
  count: number;
  /** count の単位(問 / 題) */
  unit: "問" | "題";
  /** 正答率(0〜1)。正誤のない・まだ解いていないときは null */
  accuracy: number | null;
}

export interface WeeklySkill extends WeeklyAmount {
  skill: Skill;
}

export interface WeeklyType extends WeeklyAmount {
  type: string;
  label: string;
  skill: Skill;
}

export interface WeeklyDay {
  date: string;
  /** 例: 11/18 */
  label: string;
  /** 例: 水 */
  weekday: string;
  isToday: boolean;
  totalSeconds: number;
  seconds: Record<Skill, number>;
}

export interface WeeklyReport {
  /** レポートを作った日(日本時間の日付)。保存したものを同じ日だけ使うために持つ */
  date: string;
  totalSeconds: number;
  skills: WeeklySkill[];
  days: WeeklyDay[];
  /** 形式別の内訳。バックエンドが古くて今週の値を返さないときは空 */
  types: WeeklyType[];
}

function amountOf(skill: Skill, week: StudyTotals): WeeklyAmount {
  const ungraded = UNGRADED.includes(skill);
  return {
    seconds: week.seconds,
    count: ungraded ? week.sessions : week.total,
    unit: ungraded ? "題" : "問",
    accuracy: !ungraded && week.total > 0 ? week.correct / week.total : null,
  };
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function dayLabel(date: string): { label: string; weekday: string } {
  const [y, m, d] = date.split("-").map(Number);
  return { label: `${m}/${d}`, weekday: WEEKDAYS[new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay()] ?? "" };
}

export function buildWeeklyReport(summary: StatsSummary): WeeklyReport {
  const skills: WeeklySkill[] = SKILL_ORDER.map((skill) => {
    const week = summary.skills.find((s) => s.skill === skill)?.week ?? { sessions: 0, seconds: 0, correct: 0, total: 0 };
    return { skill, ...amountOf(skill, week) };
  });

  // 日別は直近7日。daily は日本時間の今日が最後
  const last7 = summary.daily.slice(-7);
  const days: WeeklyDay[] = last7.map((d, i) => ({
    date: d.date,
    ...dayLabel(d.date),
    isToday: i === last7.length - 1,
    totalSeconds: SKILL_ORDER.reduce((sum, s) => sum + (d.seconds[s] ?? 0), 0),
    seconds: d.seconds,
  }));

  const types: WeeklyType[] = summary.types
    .flatMap((t) => (t.week && t.skill && t.week.sessions > 0 ? [{ ...t, week: t.week, skill: t.skill }] : []))
    .map((t) => ({
      type: t.type,
      label: TYPE_LABELS[t.type] ?? t.type,
      skill: t.skill,
      ...amountOf(t.skill, t.week),
    }))
    .sort((a, b) => SKILL_ORDER.indexOf(a.skill) - SKILL_ORDER.indexOf(b.skill) || b.seconds - a.seconds);

  return {
    date: summary.daily.at(-1)?.date ?? "",
    totalSeconds: skills.reduce((sum, s) => sum + s.seconds, 0),
    skills,
    days,
    types,
  };
}

/** 学習時間の表示。1分未満は「1分未満」、1時間以上は「1時間5分」 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0分";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "1分未満";
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

/** 日本時間の今日の日付(yyyy-MM-dd)。サーバーの daily の日付と同じ基準 */
export function jstDate(now: number = Date.now()): string {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const REPORT_KEY = "englishApp.weeklyReport";

/** 最後に取得した今週の学習を、サーバーの応答を待たずに出すために保存する(日付が変わったら使わない) */
export function saveWeeklyReport(report: WeeklyReport) {
  try {
    localStorage.setItem(REPORT_KEY, JSON.stringify(report));
  } catch {
    // 保存できなくても、今回の表示には影響しない
  }
}

export function loadSavedWeeklyReport(today: string): WeeklyReport | null {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    if (!raw) return null;
    const report = JSON.parse(raw) as WeeklyReport;
    const valid = Array.isArray(report.skills) && Array.isArray(report.days) && Array.isArray(report.types);
    return valid && report.date === today ? report : null;
  } catch {
    return null;
  }
}
