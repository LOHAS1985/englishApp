import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function Header() {
  const navigate = useNavigate();
  const { token, username, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="w-full bg-[#1f6aa5] shadow-sm border-b border-slate-300">
      <div className="max-w-[1200px] mx-auto w-full px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="font-serif text-lg text-white hover:text-white/90 transition-colors"
        >
          英語学習アプリ
        </button>

        <div className="flex items-center gap-3">
          {token ? (
            <>
              <button
                onClick={() => navigate("/mypage")}
                className="text-sm text-white/90 hover:underline"
              >
                {username}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold text-[#0f1724] bg-[#8fae4e] rounded px-4 py-2 hover:bg-[#7a9843] transition-colors"
              >
                ログアウト
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-[#0f1724] bg-[#8fae4e] rounded px-4 py-2 hover:bg-[#7a9843] transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
