import { useSyncExternalStore } from "react";
import { pendingCount, subscribeOutbox } from "../../api/outbox";
import { isServerWaking, subscribeServerWaking } from "../../api/http";

/**
 * 画面の下に出す通知。
 * - サーバーが応答しない間(Render の無料プランは眠っていると起動に約1分かかる)は、起動中であることを知らせる
 * - まだサーバーに送れていない解答記録があれば、その件数を知らせる(通信できたときに自動で送る)
 */
export default function StatusNotice() {
  const waking = useSyncExternalStore(subscribeServerWaking, isServerWaking);
  const pending = useSyncExternalStore(subscribeOutbox, pendingCount);

  if (!waking && pending === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 space-y-1 rounded-md bg-slate-700 px-4 py-2 text-xs text-white shadow-lg"
    >
      {waking && <p>サーバーを起動しています(最大1分ほどかかります)。このままお待ちください。</p>}
      {pending > 0 && <p>未送信の解答記録が {pending} 件あります(通信できたときに自動で送ります)。</p>}
    </div>
  );
}
