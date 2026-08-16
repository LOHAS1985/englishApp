import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../shared/components/Header";

const CATEGORIES = [
  {
    key: "writing",
    label: "ライティング",
    subtitle: "意見を論述して添削と採点を受ける",
    color: "bg-gradient-to-br from-[#f6d365] to-[#fda085]",
    items: [{ label: "英検形式の意見陳述", path: "/writing" }],
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
    items: [{ label: "会話トピック", path: "/listening" }],
    icon: "🎧",
  },
  {
    key: "speaking",
    label: "スピーキング",
    subtitle: "録音で発音・流暢さをチェック",
    color: "bg-gradient-to-br from-[#fbc2eb] to-[#a6c1ee]",
    items: [{ label: "音声録音", path: "/speaking" }],
    icon: "🗣️",
  },
];

export default function Home() {
  const navigate = useNavigate();
  // header and auth controls are handled by shared Header component

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/health`).catch(() => {
      // Renderがスリープ中でもエラーは無視
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />

      {/* メイン */}
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="mb-8">
          {/* ヘッダーにサイトタイトルを表示しているためここでは説明文を表示しない */}
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
                    <h3 className="text-2xl font-bold text-slate-900">
                      {cat.label}
                    </h3>
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
