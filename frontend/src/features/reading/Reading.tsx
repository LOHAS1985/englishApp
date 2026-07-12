import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchArticles, type ArticleSummary } from "../../api/client";
import Header from "../../shared/components/Header";

export default function Reading() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const loadArticles = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const data = await fetchArticles(q);
      setArticles(data);
    } catch {
      alert("記事の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchArticles();
        if (!cancelled) setArticles(data);
      } catch {
        if (!cancelled) alert("記事の取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadArticles(query);
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[640px]">
          <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
            READING
          </p>
          <h1 className="font-serif text-2xl text-slate-900 mb-6">
            ニュースを読む
          </h1>

          <form onSubmit={handleSearch} className="flex gap-2 mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワードで検索(例: technology)"
              className="flex-1 border border-slate-200 rounded px-3 py-2 text-sm bg-white
                         focus:outline-2 focus:outline-[#8fae4e] focus:outline-offset-1"
            />
            <button
              type="submit"
              className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-2
                         hover:bg-[#23365c] transition-colors"
            >
              検索
            </button>
          </form>

          {loading && <p className="text-sm text-slate-400">読み込み中…</p>}

          <div className="space-y-3">
            {articles.map((article) => (
              <button
                key={article.id}
                onClick={() =>
                  navigate(
                    `/reading/article?id=${encodeURIComponent(article.id)}`,
                  )
                }
                className="w-full text-left bg-white border border-slate-200 rounded-md p-5
                           hover:border-[#8fae4e] transition-colors flex gap-4"
              >
                {article.thumbnail && (
                  <img
                    src={article.thumbnail}
                    alt=""
                    className="w-20 h-20 object-cover rounded flex-shrink-0"
                  />
                )}
                <div>
                  <span className="font-mono text-xs text-slate-400">
                    {article.section}
                  </span>
                  <p className="font-serif text-base text-slate-900 leading-snug mt-1">
                    {article.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
