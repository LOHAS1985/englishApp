import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const MENU_ITEMS = [
  {
    label: "ライティング",
    description:
      "英検準1級形式の問題で意見論述を練習し、AIが4観点で採点します。",
    path: "/writing",
    available: true,
  },
  {
    label: "文法(TOEIC)",
    description:
      "TOEIC Part 5形式の文法・語彙問題を解き、解説付きで確認できます。",
    path: "/grammar",
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
  const { token, username, logout } = useAuth();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/health`).catch(() => {
      // Renderがスリープ中でもエラーは無視
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* 全幅ヘッダー */}
      <div className="flex justify-end items-center gap-3 bg-[#16233d] px-5 py-4 w-full">
        {token ? (
          <>
            <span className="text-sm text-white/80">{username}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-[#16233d] bg-[#8fae4e] rounded px-4 py-2
                         hover:bg-[#7a9843] transition-colors"
            >
              ログアウト
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-semibold text-[#16233d] bg-[#8fae4e] rounded px-4 py-2
                       hover:bg-[#7a9843] transition-colors"
          >
            ログイン
          </button>
        )}
      </div>

      {/* 本文コンテンツ(中央寄せ) */}
      <div className="flex justify-center px-5 py-12">
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
    </div>
  );
}
