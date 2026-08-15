import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/context/useAuth";

const CATEGORIES = [
  {
    key: "writing",
    label: "ライティング",
    subtitle: "意見を論述して添削と採点を受ける",
    color: "bg-gradient-to-br from-[#f6d365] to-[#fda085]",
    items: [
      { label: "英検形式の意見陳述", path: "/writing" },
      { label: "添削履歴", path: "/writing/history" },
    ],
    icon: "✍️",
  },
  {
    key: "reading",
    label: "リーディング",
    subtitle: "文法問題と The Guardian 記事で読解力を伸ばす",
    color: "bg-gradient-to-br from-[#a1c4fd] to-[#c2e9fb]",
    items: [
      { label: "文法 (TOEIC)", path: "/grammar" },
      { label: "The Guardian 記事", path: "/reading" },
    ],
    icon: "📖",
  },
  {
    key: "listening",
    label: "リスニング",
    subtitle: "会話形式の音声で実践リスニング",
    color: "bg-gradient-to-br from-[#d4fc79] to-[#96e6a1]",
    items: [
      { label: "会話トピック", path: "/listening" },
      { label: "ディクテーション", path: "/listening/dictation" },
    ],
    icon: "🎧",
  },
  {
    key: "speaking",
    label: "スピーキング",
    subtitle: "録音で発音・流暢さをチェック",
    color: "bg-gradient-to-br from-[#fbc2eb] to-[#a6c1ee]",
    items: [
      { label: "音声録音", path: "/speaking" },
      { label: "模擬面接", path: "/speaking/mock" },
    ],
    icon: "🗣️",
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
    <div className="min-h-screen bg-[#0f1724] text-slate-200">
      {/* ヘッダー */}
      <div className="flex justify-between items-center gap-3 bg-transparent px-6 py-5 w-full max-w-[1200px] mx-auto">
        <div>
          <h2 className="text-xl font-bold">英語学習アプリ</h2>
        </div>
        <div className="flex items-center gap-3">
          {token ? (
            <>
              <span className="text-sm text-white/80">{username}</span>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-[#0f1724] bg-[#8fae4e] rounded px-4 py-2
                         hover:bg-[#7a9843] transition-colors"
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-[#0f1724] bg-[#8fae4e] rounded px-4 py-2
                       hover:bg-[#7a9843] transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>

      {/* メイン */}
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold">英語学習アプリ</h1>
          <p className="text-slate-300 mt-2">
            学習したい分野を選んでください。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className={`rounded-lg overflow-hidden shadow-lg transform transition hover:scale-[1.02] ${cat.color}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">{cat.label}</h3>
                    <p className="mt-1 text-sm text-black">{cat.subtitle}</p>
                  </div>
                  <div className="text-4xl">{cat.icon}</div>
                </div>
                <div className="mt-4 bg-white/70 rounded-md p-3">
                  {cat.items.map((it) => (
                    <button
                      key={it.path}
                      onClick={() => navigate(it.path)}
                      className="w-full text-left py-2 px-2 rounded-md hover:bg-slate-100/60 transition-colors flex items-center justify-between"
                    >
                      <span className="text-slate-900">{it.label}</span>
                      <span className="text-slate-500">→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
