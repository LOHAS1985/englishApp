/**
 * 何問目かの表示。出題は「次の問題」で終わりなく続くので、画面を開いてから解いた問題の数を数える
 * (ページを離れると 1 に戻る)
 */
export default function QuestionNumber({ n }: { n: number }) {
  return <p className="text-xs font-semibold text-slate-400 mb-3">{n}問目</p>;
}
