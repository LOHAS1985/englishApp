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
    <div className="flex items-center justify-between bg-[#16233d] px-5 py-4 w-full">
      <button
        onClick={() => navigate("/")}
        className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
      >
        ← ホームに戻る
      </button>

      <div className="flex items-center gap-3">
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
    </div>
  );
}
