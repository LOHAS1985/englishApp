import PracticeSetPage from "../../shared/components/PracticeSetPage";
import ListeningPlayer from "./ListeningPlayer";
import { splitPart2Script } from "./part2Script";

const TYPES = ["toeic-part2", "toeic-part3", "toeic-part4", "eiken-part1", "eiken-part2", "eiken-part3"];
const PART2 = "toeic-part2";

export default function Listening() {
  return (
    <PracticeSetPage
      feature="listening"
      types={TYPES}
      showTitle={false}
      renderMaterial={(set) => <ListeningPlayer key={set.id} setId={set.id} />}
      // TOEIC Part 2 は問題ごとに台本を、その問題の解答の下に書く
      renderQuestionNote={(set, result, qi) => {
        if (set.type !== PART2 || !result.script) return null;
        const text = splitPart2Script(result.script)[qi];
        return text ? (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 mb-1">スクリプト</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
          </div>
        ) : null;
      }}
      renderAfterAnswer={(set, result) =>
        set.type === PART2 ? null : (
          <>
            {result.script && (
              <details className="mb-3 border border-slate-200 rounded-md p-4" open>
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer">スクリプト</summary>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.script}</p>
              </details>
            )}
            {result.translation && (
              <details className="mb-4 border border-slate-200 rounded-md p-4">
                <summary className="text-sm font-semibold text-slate-700 cursor-pointer">和訳</summary>
                <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{result.translation}</p>
              </details>
            )}
          </>
        )
      }
    />
  );
}
