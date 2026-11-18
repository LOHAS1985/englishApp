import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStatsSummary } from "../api/client";
import { SKILL_COLORS, SKILL_LABELS } from "../shared/exams";
import { loadSavedLevel, withLevel } from "../shared/level";
import {
  MENU_MINUTES,
  buildTodayMenu,
  loadSavedMenu,
  refreshDone,
  saveMenu,
  todaySeed,
  type TodayMenu,
} from "../shared/todayMenu";

interface Loaded {
  menu: TodayMenu;
  /** 今日学習した時間(分) */
  todayMinutes: number;
}

/**
 * 最新の学習記録の取得状況。保存したメニューを先に出すので、取得の途中・失敗でもメニューは見える。
 * loading=取得中 / fresh=最新 / failed=取得に失敗した(保存した内容を出している)
 */
type Status = "loading" | "fresh" | "failed";

/** 今日の保存済みのメニュー。あれば、サーバーの応答を待たずにすぐ出す(毎回の待ち時間をなくすため) */
function savedLoaded(): Loaded | null {
  const saved = loadSavedMenu(todaySeed());
  return saved ? { menu: saved, todayMinutes: saved.todayMinutes ?? 0 } : null;
}

type Mode = "normal" | "quiet";

const MODE_LABELS: Record<Mode, { title: string; note: string }> = {
  normal: { title: "通常", note: "4技能+語彙" },
  quiet: { title: "スピーキングなし", note: "電車内など" },
};

/**
 * ホームの「今日の30分メニュー」。学習量が少ない技能・正答率が低い技能を優先して、
 * 4技能+語彙の5〜10分の課題を組み合わせる。声を出せない場所のために、スピーキングなしのメニューも並べて出す。
 * 同じ日のうちは同じメニューを出し、済んだ課題に印を付ける。
 */
export default function TodayMenuSection() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded | null>(savedLoaded);
  const [status, setStatus] = useState<Status>("loading");
  const [mode, setMode] = useState<Mode>("normal");

  const load = useCallback(() => {
    fetchStatsSummary()
      .then((summary) => {
        const seed = todaySeed();
        const saved = loadSavedMenu(seed);
        const base = saved ? refreshDone(saved, summary) : buildTodayMenu(summary, seed);
        const todayMinutes = Math.round(summary.today.seconds / 60);
        // 済みの印と学習時間を最新にして保存する。次に開いたときは、これを待たずに出す
        const menu = { ...base, todayMinutes };
        saveMenu(menu);
        setLoaded({ menu, todayMinutes });
        setStatus("fresh");
      })
      .catch(() => setStatus("failed"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 保存済みのメニューが無い日の最初の1回だけは、記録を取得してから作る
  if (!loaded && status === "failed") {
    return (
      <div className="mb-6 rounded-lg bg-white border border-slate-200 p-4 text-sm text-slate-600">
        今日のメニューを作れませんでした(サーバーが起動中の可能性があります)。
        <button
          onClick={() => {
            setStatus("loading");
            load();
          }}
          className="ml-2 text-[#2463a8] hover:underline"
        >
          もう一度試す
        </button>
      </div>
    );
  }
  if (!loaded) {
    return <p className="mb-6 text-sm text-slate-400">今日のメニューを作っています…</p>;
  }

  const { menu, todayMinutes } = loaded;
  const plan = menu[mode];
  const progress = Math.min(100, Math.round((todayMinutes / MENU_MINUTES) * 100));
  const allDone = plan.tasks.length > 0 && plan.tasks.every((t) => t.done);

  return (
    <section className="mb-8 rounded-lg bg-white border border-slate-200 shadow-sm p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg font-bold text-slate-900">今日の{MENU_MINUTES}分メニュー</h2>
        <span className="text-sm text-slate-600">
          今日の学習 <span className="font-mono font-semibold">{todayMinutes}</span> 分 / {MENU_MINUTES}分
          {status === "loading" && <span className="ml-2 text-xs text-slate-400">更新中…</span>}
          {status === "failed" && (
            <span className="ml-2 text-xs text-[#c0392b]">最新の状況を取得できませんでした(保存した内容を表示中)</span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 mb-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-2 rounded-full bg-[#5b9a3c]" style={{ width: `${progress}%` }} />
      </div>

      {/* 声を出せない場所(電車内など)では、スピーキングを除いたメニューに切り替える */}
      <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="メニューの種類">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-md border px-3 py-2 text-left transition-colors ${
              mode === m ? "border-[#2463a8] bg-[#2463a8]/5" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="block text-sm font-semibold text-slate-900">{MODE_LABELS[m].title}</span>
            <span className="block text-xs text-slate-500">
              {MODE_LABELS[m].note}・約{menu[m].totalMinutes}分
            </span>
          </button>
        ))}
      </div>

      {plan.tasks.length === 0 ? (
        <p className="text-sm text-slate-600">今日のメニューを作れませんでした。</p>
      ) : (
        <ul className="space-y-2">
          {plan.tasks.map((t, i) => (
            <li key={t.id}>
              <button
                onClick={() => navigate(t.review ? t.path : withLevel(t.path, loadSavedLevel()))}
                className={`w-full text-left rounded-md border px-3 py-2.5 flex items-center gap-3 transition-colors hover:bg-slate-50 ${
                  t.review ? "border-l-4 border-l-[#c0392b] border-slate-200" : "border-slate-200"
                } ${t.done ? "bg-slate-50" : ""}`}
              >
                <span className="font-mono text-sm text-slate-400 w-4">{i + 1}</span>
                <span className={`inline-block h-3 w-3 rounded-full shrink-0 ${SKILL_COLORS[t.skill]}`} aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className={`block ${t.done ? "line-through text-slate-500" : "text-slate-900"}`}>
                    {t.label}
                    <span className="ml-2 text-xs text-slate-500">
                      {SKILL_LABELS[t.skill]}・{t.note}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500">{t.reason}</span>
                </span>
                <span className={t.done ? "text-sm text-[#5b9a3c] font-semibold" : "text-slate-500"}>
                  {t.done ? "済 ✓" : "→"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-slate-500">
        {allDone
          ? "このメニューを全部終えました。"
          : "学習量が少ない技能・正答率が低い技能を優先して選んでいます。同じ日のうちは同じメニューです。"}
      </p>
    </section>
  );
}
