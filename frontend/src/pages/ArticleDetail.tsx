import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  fetchArticleDetail,
  type ArticleDetail as ArticleDetailType,
} from "../api/client";
import Header from "../components/Header";
import HighlightedBody from "../components/HighlightedBody";

export default function ArticleDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get("id");

  const [article, setArticle] = useState<ArticleDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate("/reading");
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await fetchArticleDetail(id!);
        if (!cancelled) setArticle(data);
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
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[640px]">
          <button
            onClick={() => navigate("/reading")}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors"
          >
            ← 記事一覧に戻る
          </button>

          {loading && <p className="text-sm text-slate-400">読み込み中…</p>}

          {!loading && article && (
            <div className="bg-white border border-slate-200 rounded-md p-9">
              <h1 className="font-serif text-2xl text-slate-900 leading-snug mb-2">
                {article.title}
              </h1>
              {article.byline && (
                <p className="text-sm text-slate-400 mb-6">{article.byline}</p>
              )}

              <div className="bg-[#f2f7ea] border border-[#8fae4e]/30 rounded-md p-5 mb-6">
                <p className="font-mono text-xs font-semibold tracking-widest text-[#6a8a3e] mb-2">
                  AI SUMMARY
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <HighlightedBody
                body={article.body}
                vocabulary={article.vocabulary}
              />

              {article.vocabulary.length > 0 && (
                <div className="border-t border-slate-100 pt-6 mb-6">
                  <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-4">
                    VOCABULARY
                  </p>
                  <div className="space-y-4">
                    {article.vocabulary.map((v, i) => (
                      <div key={i}>
                        <p className="text-sm font-semibold text-slate-900">
                          {v.word}
                          <span className="font-normal text-slate-500 ml-2">
                            {v.meaning}
                          </span>
                        </p>
                        <p className="text-sm text-slate-500 leading-relaxed mt-1">
                          {v.example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <a
                href={article.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#8fae4e] font-semibold hover:underline"
              >
                原文を読む(The Guardian)→
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
