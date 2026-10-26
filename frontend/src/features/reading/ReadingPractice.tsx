import PracticeSetPage from "../../shared/components/PracticeSetPage";

const TYPE_LABELS = {
  "toeic-part6": "TOEIC Part 6(長文穴埋め)",
  "toeic-part7": "TOEIC Part 7(読解)",
  "eiken-cloze": "英検 大問2(空所補充)",
  "eiken-long": "英検 大問3(内容一致)",
};

export default function ReadingPractice() {
  return (
    <PracticeSetPage
      feature="reading"
      eyebrow="READING PRACTICE"
      title="読解問題"
      typeLabels={TYPE_LABELS}
      renderMaterial={(set) => (
        <div className="font-serif text-[15px] leading-7 text-slate-800 whitespace-pre-wrap border border-slate-200 rounded-md p-4 bg-slate-50">
          {set.passage}
        </div>
      )}
    />
  );
}
