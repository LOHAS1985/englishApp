import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchArticleDetail, recordReading, type ArticleDetail as ArticleDetailType, type ReadingRecordResult } from "../../api/client";
import { useAuth } from "../../shared/context/useAuth";
import Header from "../../shared/components/Header";
import HighlightedBody from "./HighlightedBody";

export default function ArticleDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const id = searchParams.get("id");

  const [article, setArticle] = useState<ArticleDetailType | null>(null);
  const [loading, setLoading] = useState(true);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ReadingRecordResult | null>(null);
  const intervalRef = useRef<number | null>(null);

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
        if (!cancelled) {
          setArticle(data);
          setIsRunning(true); // 記事表示開始と同時に計測開始
        }
      } catch {
        if (!cancelled) alert("記事の取得に失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      setIsRunning(false);
    };
  }, [id, navigate]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const wordCount = article ? article.body.trim().split(/\s+/).length : 0;

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleFinish = async () => {
    setIsRunning(false);
    if (!article) return;

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const data = await recordReading(article.id, article.title, wordCount, elapsedSeconds, token);
      setResult(data);
    } catch {
      alert("記録の保存に失敗しました");
    }
  };

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
              {!result && (
                <div className="flex items-center justify-between mb-6 p-4 bg-[#f0f2f5] rounded-md">
                  <div>
                    <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-1">
                      READING TIME
                    </p>
                    <p className="font-mono text-2xl font-semibold text-slate-900">
                      {formatTime(elapsedSeconds)}
                    </p>
                  </div>
                  <button
                    onClick={handleFinish}
                    className="text-sm font-semibold text-white bg-[#8fae4e] rounded px-5 py-3
                               hover:bg-[#7a9843] transition-colors"
                  >
                    読み終えた
                  </button>
                </div>
              )}

              {result && (
                <div className="mb-6 p-5 bg-[#f2f7ea] border border-[#8fae4e]/30 rounded-md">
                  <p className="font-mono text-xs font-semibold tracking-widest text-[#6a8a3e] mb-3">
                    READING RESULT
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="font-mono text-2xl font-semibold text-slate-900">
                        {result.wordCount}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">語数</p>
                    </div>
                    <div>
                      <p className="font-mono text-2xl font-semibold text-slate-900">
                        {formatTime(result.durationSeconds)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">時間</p>
                    </div>
                    <div>
                      <p className="font-mono text-2xl font-semibold text-[#6a8a3e]">
                        {result.wpm}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">WPM</p>
                    </div>
                  </div>
                </div>
              )}

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

              <HighlightedBody body={article.body} vocabulary={article.vocabulary} />

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
    </div >
  );
}