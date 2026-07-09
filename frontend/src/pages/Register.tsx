import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/client";
import { useAuth } from "../context/useAuth";
import Header from "../components/Header";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(username, password);
      setAuth(data.token, data.username);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex justify-center px-5 py-12">
      <Header />
      <div className="w-full max-w-[400px] bg-white border border-slate-200 rounded-md p-9">
        <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
          REGISTER
        </p>
        <h1 className="font-serif text-2xl text-slate-900 mb-6">新規登録</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              ユーザー名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm
                         focus:outline-2 focus:outline-[#8fae4e] focus:outline-offset-1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-slate-200 rounded px-3 py-2 text-sm
                         focus:outline-2 focus:outline-[#8fae4e] focus:outline-offset-1"
            />
          </div>

          {error && <p className="text-sm text-[#c0392b]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3
                       hover:bg-[#23365c] disabled:bg-slate-400 transition-colors"
          >
            {loading ? "登録中…" : "登録する"}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-5 text-center">
          既にアカウントをお持ちの方は{" "}
          <Link to="/login" className="text-[#8fae4e] font-semibold">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
