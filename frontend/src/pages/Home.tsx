import { useNavigate } from "react-router-dom";

const MENU_ITEMS = [
  {
    label: "ライティング",
    description:
      "英検準1級形式の問題で意見論述を練習し、AIが4観点で採点します。",
    path: "/writing",
    available: true,
  },
  {
    label: "リーディング",
    description: "近日公開",
    path: "/reading",
    available: false,
  },
  {
    label: "リスニング",
    description: "近日公開",
    path: "/listening",
    available: false,
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex justify-center px-5 py-12">
      <div className="w-full max-w-[640px]">
        <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
          EIKEN PRACTICE
        </p>
        <h1 className="font-serif text-3xl text-slate-900 mb-2">
          英語学習アプリ
        </h1>
        <p className="text-sm text-slate-600 mb-10">
          練習したい項目を選んでください。
        </p>

        <div className="space-y-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.path}
              onClick={() => item.available && navigate(item.path)}
              disabled={!item.available}
              className={`w-full text-left bg-white border rounded-md p-6 transition-colors
                ${
                  item.available
                    ? "border-slate-200 hover:border-[#8fae4e] cursor-pointer"
                    : "border-slate-200 opacity-50 cursor-default"
                }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-serif text-lg text-slate-900">
                  {item.label}
                </span>
                {item.available && (
                  <span className="text-[#8fae4e] text-lg">→</span>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
