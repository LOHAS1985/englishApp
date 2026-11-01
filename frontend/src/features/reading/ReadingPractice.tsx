import PracticeSetPage from "../../shared/components/PracticeSetPage";

const TYPES = ["toeic-part6", "toeic-part7", "eiken-cloze", "eiken-long"];

export default function ReadingPractice() {
  return (
    <PracticeSetPage
      feature="reading"
      types={TYPES}
      showTitle
      renderMaterial={(set) => (
        <div className="font-serif text-[15px] leading-7 text-slate-800 whitespace-pre-wrap border border-slate-200 rounded-md p-4 bg-slate-50">
          {set.passage}
        </div>
      )}
    />
  );
}
