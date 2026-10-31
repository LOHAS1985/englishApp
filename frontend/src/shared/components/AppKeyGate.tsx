import { useEffect, useState } from "react";
import { APP_KEY_REQUIRED_EVENT, saveAppKey } from "../../api/client";

/**
 * サーバーが合言葉(APP_ACCESS_KEY)を求めたら、入力画面を重ねて表示する。
 * 一度入力すればこの端末のブラウザに保存され、以後の API 呼び出しに自動で付く。
 */
export default function AppKeyGate() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(APP_KEY_REQUIRED_EVENT, show);
    return () => window.removeEventListener(APP_KEY_REQUIRED_EVENT, show);
  }, []);

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    saveAppKey(key.trim());
    // 失敗した読み込みをやり直すため、画面ごと読み込み直す
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-800">合言葉を入力してください</h2>
        <p className="mt-2 text-sm text-slate-600">
          サーバーに設定した合言葉(APP_ACCESS_KEY)です。この端末に保存され、次回からは入力不要です。
        </p>
        <input
          type="password"
          autoFocus
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="mt-4 w-full rounded border border-slate-300 px-3 py-2"
          autoComplete="current-password"
        />
        <button
          type="submit"
          className="mt-4 w-full rounded bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600"
        >
          保存して再読み込み
        </button>
      </form>
    </div>
  );
}
