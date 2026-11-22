import { useEffect, useState } from "react";
import { fetchBackendCommit } from "../../api/client";
import { FRONTEND_COMMIT, FRONTEND_COMMIT_DATE, formatJst } from "../buildInfo";

/**
 * 開いている画面の版(作った commit と日時)と、つながっているサーバーの commit を小さく出す。
 * 2つの commit が違えば「版が違います」と出す(サーバーの反映が遅い、または画面が古い)。
 */
export default function BuildVersion() {
  const [server, setServer] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchBackendCommit().then((commit) => {
      if (alive) setServer(commit);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ローカルの開発(commit が local / unknown)では比べない
  const comparable = FRONTEND_COMMIT !== "unknown" && server !== null && server !== "local";
  const mismatch = comparable && !server.startsWith(FRONTEND_COMMIT);

  const parts = [`版 ${FRONTEND_COMMIT}`];
  const date = formatJst(FRONTEND_COMMIT_DATE);
  if (date) parts.push(date);
  if (server) parts.push(`サーバー ${server.slice(0, 7)}`);
  if (mismatch) parts.push("版が違います");

  return <p className="text-sm leading-tight text-slate-300">{parts.join(" ・ ")}</p>;
}
