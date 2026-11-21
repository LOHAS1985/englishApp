import { canPronounce, pronounce } from "./pronounce";

/**
 * 単語(または例文)の読み方を再生するボタン。読み上げが使えないブラウザでは出さない。
 * 例文を読むときは label に「例文を再生」を渡す(長い文を、ボタンの名前に入れないため)
 */
export default function PronounceButton({
  word,
  className = "",
  label,
}: {
  word: string;
  className?: string;
  label?: string;
}) {
  if (!canPronounce()) return null;
  return (
    <button
      type="button"
      aria-label={label ?? `「${word}」の読み方を再生`}
      title={label ?? "読み方を再生"}
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
