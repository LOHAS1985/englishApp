import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { wakeUpServer } from "../api/client";
import Header from "../shared/components/Header";
import { EXAM_MENUS } from "../shared/exams";

export default function Home() {
  const navigate = useNavigate();
  // 選んだ試験は URL(?exam=)に持たせ、問題画面から戻ったときもメニューを開いたままにする
  const [searchParams, setSearchParams] = useSearchParams();
  const menu = EXAM_MENUS.find((m) => m.exam === searchParams.get("exam"));

  useEffect(() => {
    wakeUpServer();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!menu ? (
          <>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">どの試験の対策をしますか?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {EXAM_MENUS.map((m) => (
                <button
                  key={m.exam}
                  onClick={() => setSearchParams({ exam: m.exam })}
                  className={`text-left rounded-lg shadow-lg p-6 transform transition hover:scale-[1.02] ${m.color}`}
                >
                  <h3 className="text-2xl font-bold text-slate-900">{m.title}</h3>
                  <p className="mt-1 text-sm text-black">{m.goal}</p>
                  <p className="mt-4 text-sm text-slate-800">
                    {m.sections.map((s) => s.skill).join(" / ")}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-8 rounded-lg bg-white border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">共通</p>
              <button
                onClick={() => navigate("/reading")}
                className="w-full text-left py-2 px-2 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-between"
              >
                <span>The Guardian 記事で多読</span>
                <span className="text-slate-500">→</span>
              </button>
            </div>
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
              <p className="mt-1 text-sm text-black">{menu.goal}</p>
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
                      onClick={() => navigate(it.path)}
                      className="w-full text-left py-2.5 px-2 rounded-md hover:bg-slate-100 transition-colors flex items-center justify-between gap-3"
                    >
                      <span>
                        <span className="block text-slate-900">{it.label}</span>
                        <span className="block text-xs text-slate-500">{it.note}</span>
                      </span>
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
