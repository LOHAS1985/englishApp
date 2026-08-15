import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string | number;
  username: string;
  email: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  const submitWord = async () => {
    // backend エンドポイントはまだ無い想定。将来は POST /api/admin/words へ送る
    alert(`単語を登録: ${word} — 意味: ${meaning} — 例: ${example}`);
    setWord("");
    setMeaning("");
    setExample("");
  };

  const loadUsers = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/admin/users`,
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setUsers(data || []);
    } catch {
      alert(
        "ユーザー一覧の取得に失敗しました（エンドポイント未実装か権限エラー）",
      );
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 p-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">管理ページ</h1>
          <button
            onClick={() => navigate("/")}
            className="text-sm px-3 py-2 bg-slate-200 rounded"
          >
            ホームへ戻る
          </button>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-2">単語管理</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              className="p-2 border"
              placeholder="単語 (English)"
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
            <input
              className="p-2 border"
              placeholder="意味 (日本語)"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
            />
            <input
              className="p-2 border"
              placeholder="例文 (English)"
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
          </div>
          <div>
            <button
              onClick={submitWord}
              className="px-4 py-2 bg-[#8fae4e] text-white rounded"
            >
              登録（ダミー）
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">ユーザー記録</h2>
          <div className="mb-3">
            <button
              onClick={loadUsers}
              className="px-3 py-2 bg-blue-500 text-white rounded"
            >
              ユーザー一覧を取得
            </button>
          </div>

          <div className="bg-slate-50 border rounded p-3">
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">
                ユーザーが読み込まれていません。
              </p>
            ) : (
              <ul>
                {users.map((u) => (
                  <li key={u.id} className="py-2 border-b">
                    {u.username} — {u.email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
