import type { Ref } from "react";
import type { WordbookAnswerResult, WordbookColor } from "../../api/client";
import ColorButtons from "./ColorButtons";
import PronounceButton from "./PronounceButton";
import SenseList from "./SenseList";

interface Props {
  result: WordbookAnswerResult;
  /** 答えずに「答えを見る」を押した(「不正解」とは出さず、正解だけを出す) */
  revealed: boolean;
  color: WordbookColor;
  onColorChange: (color: WordbookColor) => void;
  onNext: () => void;
  /** 解答したら「次の問題」にフォーカスを移す(Enter で続けられる)ため */
  nextButtonRef: Ref<HTMLButtonElement>;
}

/** 単語帳の解答後の表示。正誤・正解・訳・品詞ごとの意味・例文・色・次の問題 */
export default function AnswerResultPanel({ result, revealed, color, onColorChange, onNext, nextButtonRef }: Props) {
  return (
    <div className="mt-6 text-sm leading-relaxed">
      {!revealed && (
        <p className={`font-semibold ${result.correct ? "text-[#6a8a3e]" : "text-[#c0392b]"}`}>
          {result.correct ? "正解" : "不正解"}
        </p>
      )}
      {!result.correct && (
        <p className="text-slate-600 mt-1">
          正解: <span className="font-semibold text-slate-900">{result.correctAnswer}</span>
        </p>
      )}
      <p className="text-slate-700 mt-3 flex flex-wrap items-center gap-2">
        <PronounceButton word={result.word} />
        {result.word}
        {result.meaningJa && <span className="text-slate-500 ml-2">{result.meaningJa}</span>}
      </p>
      {result.senses && result.senses.length > 0 && (
        <div className="mt-3">
          {/* 出題の意味だけで覚えないよう、ほかの品詞・意味も出す */}
          <p className="text-xs text-slate-500 mb-1">品詞ごとの意味</p>
          <SenseList senses={result.senses} />
        </div>
      )}
      {result.exampleEn && (
        <p className="text-slate-600 mt-2 flex items-start gap-2">
          <span className="flex-1">{result.exampleEn}</span>
          <PronounceButton word={result.exampleEn} label="例文を再生" />
        </p>
      )}
      {result.exampleJa && <p className="text-slate-500 mt-1">{result.exampleJa}</p>}

      <div className="mt-5">
        <p className="text-xs text-slate-500 mb-2">この単語の色</p>
        <ColorButtons value={color} onChange={onColorChange} />
      </div>

      <button
        ref={nextButtonRef}
        onClick={onNext}
        className="mt-6 text-sm font-semibold text-white bg-[#8fae4e] rounded px-5 py-3 hover:bg-[#7a9843] transition-colors"
      >
        次の問題
      </button>
    </div>
  );
}
