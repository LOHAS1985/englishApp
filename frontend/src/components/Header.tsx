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
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={() => navigate("/")}
        className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        ← ホームに戻る
      </button>

      <div className="flex items-center gap-3">
        {token ? (
          <>
            <span className="text-sm text-slate-600">{username}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-white bg-[#16233d] rounded px-4 py-2
                         hover:bg-[#23365c] transition-colors"
            >
              ログアウト
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-semibold text-white bg-[#16233d] rounded px-4 py-2
                       hover:bg-[#23365c] transition-colors"
          >
            ログイン
          </button>
        )}
      </div>
    </div>
  );
}
