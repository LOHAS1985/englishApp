import { canPronounce, pronounce } from "./pronounce";

/** 単語の読み方を再生するボタン。読み上げが使えないブラウザでは出さない */
export default function PronounceButton({ word, className = "" }: { word: string; className?: string }) {
  if (!canPronounce()) return null;
  return (
    <button
      type="button"
      aria-label={`「${word}」の読み方を再生`}
      title="読み方を再生"
      onClick={(e) => {
        // 一覧の行など、親のクリックに伝えない
        e.stopPropagation();
        void pronounce(word);
      }}
      className={`inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 w-8 h-8 text-base align-middle ${className}`}
    >
      <span aria-hidden>🔊</span>
    </button>
  );
}
