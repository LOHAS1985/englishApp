import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="w-full bg-slate-700 shadow-sm border-b border-slate-600">
      <div className="max-w-[1200px] mx-auto w-full px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="text-lg text-white hover:text-white/90 transition-colors"
        >
          英語学習アプリ
        </button>

        <button
          onClick={() => navigate("/mypage")}
          className="text-sm font-semibold text-[#0f1724] bg-[#8fae4e] rounded px-4 py-2 hover:bg-[#7a9843] transition-colors"
        >
          学習記録
        </button>
      </div>
    </header>
  );
}
