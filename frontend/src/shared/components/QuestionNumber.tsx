import { levelLabel } from "../level";

/**
 * 何問目かの表示。出題は「次の問題」で終わりなく続くので、画面を開いてから解いた問題の数を数える
 * (ページを離れると 1 に戻る)。
 * 難易度を渡すと横に出す(問題集の難易度の付け方を、解きながら見直すため)
 */
export default function QuestionNumber({ n, difficulty }: { n: number; difficulty?: number | null }) {
  const label = levelLabel(difficulty);
  return (
    <p className="text-xs font-semibold text-slate-400 mb-3">
      {n}問目
      {label && (
        <span className="ml-2 font-normal">
          難易度 {difficulty}({label})
        </span>
      )}
    </p>
  );
}
