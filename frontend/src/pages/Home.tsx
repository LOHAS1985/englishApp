import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { wakeUpServer } from "../api/client";
import Header from "../shared/components/Header";
import { EXAM_MENUS } from "../shared/exams";
import { DifficultySelect } from "../shared/components/Difficulty";
import { loadSavedLevel, saveLevel, withLevel } from "../shared/level";
import TodayMenuSection from "./TodayMenuSection";
import WeeklyStatsSection from "./WeeklyStatsSection";

/** ホームの単語帳のカード。試験のカードと並べ、よく使う入口へすぐ飛べるようにする */
const WORDBOOK_ACTIONS = [
  { label: "4択", path: "/wordbook/quiz?type=choice" },
  { label: "穴埋め", path: "/wordbook/quiz?type=fill" },
  { label: "一覧", path: "/wordbook/list" },
];

export default function Home() {
  const navigate = useNavigate();
  // 選んだ試験は URL(?exam=)に持たせ、問題画面から戻ったときもメニューを開いたままにする
  const [searchParams, setSearchParams] = useSearchParams();
  const menu = EXAM_MENUS.find((m) => m.exam === searchParams.get("exam"));

  // 難易度は問題を解く前にここで一度だけ選ぶ(問題画面には ?level= で渡す)
  const [level, setLevel] = useState<number | undefined>(loadSavedLevel);
  const changeLevel = (l: number | undefined) => {
    setLevel(l);
    saveLevel(l);
  };

  // 復習は「今日のメニュー」に入るので、ホームには別に出さない
  useEffect(() => {
    wakeUpServer();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!menu ? (
          <>
            <TodayMenuSection />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {EXAM_MENUS.map((m) => (
                <button
                  key={m.exam}
                  onClick={() => setSearchParams({ exam: m.exam })}
                  className={`text-left rounded-lg shadow-lg p-6 transform transition hover:scale-[1.02] ${m.color}`}
                >
                  <h3 className="text-2xl font-bold text-slate-900">{m.title}</h3>
                  <p className="mt-4 text-sm text-slate-800">
                    {m.sections.map((s) => s.skill).join(" / ")}
                  </p>
                </button>
              ))}

              <div
                className="rounded-lg shadow-lg p-6 transform transition hover:scale-[1.02] bg-gradient-to-br from-[#84fab0] to-[#8fd3f4] flex flex-col"
                aria-label="単語帳"
                role="group"
              >
                <button onClick={() => navigate("/wordbook")} className="text-left flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-2xl font-bold text-slate-900">単語帳</span>
                    <span className="text-2xl" aria-hidden>
                      📚
                    </span>
                  </span>
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  {WORDBOOK_ACTIONS.map((a) => (
                    <button
                      key={a.path}
                      onClick={() => navigate(a.path)}
                      className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100 transition-colors"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <WeeklyStatsSection />
          </>
        ) : (
          <>
            <button
              onClick={() => setSearchParams({})}
              className="text-sm text-[#2463a8] hover:underline mb-4"
            >
              ← 試験の選択に戻る
            </button>
            <div className={`rounded-lg shadow-lg p-6 mb-6 ${menu.color}`}>
              <h2 className="text-2xl font-bold text-slate-900">{menu.title}</h2>
            </div>

            <div className="mb-6 rounded-lg bg-white border border-slate-200 p-4">
              <DifficultySelect value={level} onChange={changeLevel} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {menu.sections.map((section) => (
                <div key={section.skill} className="rounded-lg bg-white border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-slate-900">{section.skill}</h3>
                    <span className="text-2xl">{section.icon}</span>
                  </div>
                  {section.items.map((it) => (
                    <button
                      key={it.path}
                      onClick={() => navigate(withLevel(it.path, level))}
                      className="w-full text-left py-2.5 px-2 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-between gap-3"
                    >
                      <span className="text-slate-900">{it.label}</span>
                      <span className="text-slate-500">→</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
