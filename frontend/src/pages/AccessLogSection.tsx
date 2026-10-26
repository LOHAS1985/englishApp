import { useEffect, useState } from "react";
import {
  AccessLogKeyError,
  fetchAccessLogs,
  type AccessIpSummary,
  type AccessLogResponse,
} from "../api/client";

const KEY_STORAGE = "accessLogKey";
const PERIODS = [7, 30, 90];

function loadKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function saveKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // 保存できない環境では、このページを開いている間だけ使う
  }
}

const formatTime = (value: string) =>
  new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const place = (s: { country: string | null; region: string | null; city: string | null }) =>
  [...new Set([s.country, s.region, s.city].filter(Boolean))].join(" ") || "不明";

/** どこからアクセスされたかを IP ごとに表示する。IP を含むため閲覧キーが必要 */
export default function AccessLogSection() {
  const [key, setKey] = useState(loadKey);
  const [input, setInput] = useState("");
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AccessLogResponse | null>(null);
  const [error, setError] = useState("");
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchAccessLogs(key, days)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError("");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setData(null);
        if (e instanceof AccessLogKeyError) {
          saveKey("");
          setKey("");
        }
        setError(e instanceof Error ? e.message : "アクセス履歴の取得に失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [key, days]);

  const submitKey = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    saveKey(trimmed);
    setKey(trimmed);
    setInput("");
  };

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-3">アクセス履歴</h2>

      {!key && (
        <div className="bg-white border border-slate-200 rounded-md p-5">
          <p className="text-sm text-slate-600 mb-3">
            IP アドレスを含むため、閲覧キー(サーバーの ACCESS_LOG_KEY)を入力してください。
            このブラウザに保存され、次回からは入力不要です。
          </p>
          {error && <p className="text-sm text-[#c0392b] mb-3">{error}</p>}
          <div className="flex gap-2">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitKey()}
              className="flex-1 min-w-0 border border-slate-300 rounded px-3 py-2 text-sm"
              placeholder="閲覧キー"
              autoComplete="off"
            />
            <button
              onClick={submitKey}
              className="text-sm font-semibold text-white bg-[#16233d] rounded px-4 py-2 hover:bg-[#23365c] transition-colors"
            >
              表示
            </button>
          </div>
        </div>
      )}

      {key && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className={`text-xs sm:text-sm rounded-full border px-3 py-1.5 transition-colors ${
                  days === p
                    ? "bg-[#16233d] border-[#16233d] text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:border-[#16233d]"
                }`}
              >
                直近{p}日
              </button>
            ))}
            <button
              onClick={() => {
                saveKey("");
                setKey("");
                setData(null);
              }}
              className="ml-auto text-xs text-slate-500 hover:underline"
            >
              閲覧キーを消す
            </button>
          </div>

          {error && <p className="text-sm text-[#c0392b]">{error}</p>}
          {!data && !error && <p className="text-sm text-slate-400">読み込み中…</p>}

          {data && (
            <>
              <p className="text-sm text-slate-600 mb-3">
                アクセス {data.total} 件 / 接続元 {data.summaries.length} 件
              </p>
              {data.summaries.length === 0 && (
                <p className="text-sm text-slate-500">この期間のアクセスはありません。</p>
              )}
              <div className="space-y-3">
                {data.summaries.map((s: AccessIpSummary) => (
                  <div key={s.ip} className="bg-white border border-slate-200 rounded-md p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-sm text-slate-900 break-all">{s.ip}</span>
                      <span className="font-mono text-sm font-semibold text-slate-900 shrink-0">
                        {s.count} 回
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{place(s)}</p>
                    <p className="text-xs text-slate-500">回線: {s.isp ?? "不明"}</p>
                    <p className="text-xs text-slate-500">端末: {s.devices}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatTime(s.firstSeen)} 〜 {formatTime(s.lastSeen)}
                    </p>
                  </div>
                ))}
              </div>

              {data.recent.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowRecent((v) => !v)}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    {showRecent ? "最近のアクセスを閉じる" : "最近のアクセス(最大100件)を見る"}
                  </button>
                  {showRecent && (
                    <ul className="mt-2 bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
                      {data.recent.map((r, i) => (
                        <li key={i} className="px-3 py-2 text-xs text-slate-600">
                          <span className="font-mono text-slate-400 mr-2">{formatTime(r.createdAt)}</span>
                          <span className="font-mono mr-2">{r.ip}</span>
                          <span className="mr-2">{place(r)}</span>
                          <span className="mr-2">{r.device}</span>
                          <span className="font-mono text-slate-400 break-all">
                            {r.method} {r.path}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
