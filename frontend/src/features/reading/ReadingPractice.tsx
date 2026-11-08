import { useSearchParams } from "react-router-dom";
import PracticeSetPage from "../../shared/components/PracticeSetPage";

const TYPES = ["toeic-part6", "toeic-part7", "eiken-cloze", "eiken-long"];

export default function ReadingPractice() {
  // ?speed=1 のときは読解速度を計測する(本文を読み終えるまでの時間から語/分を出す)
  const [searchParams] = useSearchParams();
  return (
    <PracticeSetPage
      feature="reading"
      types={TYPES}
      showTitle
      readingSpeed={searchParams.get("speed") === "1"}
      renderMaterial={(set, result) => (
        <>
          <div className="font-serif text-[15px] leading-7 text-slate-800 whitespace-pre-wrap border border-slate-200 rounded-md p-4 bg-slate-50">
            {set.passage}
          </div>
          {/* 和訳は解答後に、英文の下に並べて読み比べられるようにする */}
          {result?.translation && (
            <div className="mt-3 text-sm leading-7 text-slate-600 whitespace-pre-wrap border border-slate-200 rounded-md p-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">和訳</p>
              {result.translation}
            </div>
          )}
        </>
      )}
    />
  );
}
