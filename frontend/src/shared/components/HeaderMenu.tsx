import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DisplaySettingsControl from "./DisplaySettingsControl";

/**
 * ヘッダーのメニュー。学習記録への入口と、表示の設定(配色・文字の大きさ・全幅)をまとめる。
 * 外を押す・Esc・学習記録を選ぶと閉じる。
 */
export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="メニュー"
        aria-expanded={open}
        aria-controls={panelId}
        className="flex h-9 w-9 items-center justify-center rounded text-xl leading-none text-white hover:bg-white/10 transition-colors"
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-4 rounded border border-slate-500 bg-slate-700 p-4 shadow-lg"
        >
          <Link
            to="/mypage"
            onClick={() => setOpen(false)}
            className="rounded bg-[#8fae4e] px-4 py-2 text-center text-sm font-semibold text-[#0f1724] hover:bg-[#7a9843] transition-colors"
          >
            学習記録
          </Link>
          <DisplaySettingsControl />
        </div>
      )}
    </div>
  );
}
