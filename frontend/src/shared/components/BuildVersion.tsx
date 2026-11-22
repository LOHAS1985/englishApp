import { useEffect, useState } from "react";
import { fetchBackendCommit } from "../../api/client";
import { FRONTEND_COMMIT, FRONTEND_COMMIT_DATE, FRONTEND_VERSION, formatJst } from "../buildInfo";

/**
 * 開いている画面の版(番号と日時)を小さく出す。
 * つながっているサーバーの commit がこの画面と違えば、「サーバーが別の版です」と出す(反映が遅い、または画面が古い)。
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

  const text = [`v${FRONTEND_VERSION}`, formatJst(FRONTEND_COMMIT_DATE)].filter(Boolean).join(" ・ ");

  return (
    <p className="text-sm leading-tight text-slate-300">
      {text}
      {mismatch && <span className="ml-2 font-semibold text-white">サーバーが別の版です({server.slice(0, 7)})</span>}
    </p>
  );
}
