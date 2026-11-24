import PracticeSetPage from "../../shared/components/PracticeSetPage";
import WordCapture from "../wordbook/WordCapture";
import ListeningPlayer from "./ListeningPlayer";
import { warmUpListeningAudio } from "./audioPrepare";
import { splitPart2Script } from "./part2Script";

const TYPES = ["toeic-part2", "toeic-part3", "toeic-part4", "eiken-part1", "eiken-part2", "eiken-part3"];
const PART2 = "toeic-part2";

export default function Listening() {
  return (
    <PracticeSetPage
      feature="listening"
      types={TYPES}
      showTitle={false}
      // 練習では音声を何度でも聞き直せる(利用者の要望。本番と同じ1回だけの条件は模試で練習する)。
      // 英検 Part 1・2 は本番では設問も放送で読まれるが、音声(台本)に設問が入っていないので、設問文は最初から画面に出す
      renderMaterial={(set) => <ListeningPlayer key={set.id} setId={set.id} />}
      // 解答した時点で次のセットの音声を読み込んでおき、「次の問題」の後すぐ再生できるようにする
      onNextPicked={(next) => warmUpListeningAudio(next.id)}
      // TOEIC Part 2 は問題ごとに台本を、その問題の解答の下に書く
      renderQuestionNote={(set, result, qi) => {
        if (set.type !== PART2 || !result.script) return null;
        const text = splitPart2Script(result.script)[qi];
        return text ? (
          <WordCapture>
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">スクリプト</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
            </div>
          </WordCapture>
        ) : null;
      }}
      renderAfterAnswer={(set, result) =>
        set.type === PART2 ? null : (
          <>
            {result.script && (
              <WordCapture>
                <details className="mb-3 border border-slate-200 rounded-md p-4" open>
                  <summary className="text-sm font-semibold text-slate-700 cursor-pointer">スクリプト</summary>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{result.script}</p>
                </details>
              </WordCapture>
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
