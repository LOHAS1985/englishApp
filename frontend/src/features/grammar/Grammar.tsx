import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchGrammarQuestion, submitGrammarAnswer } from "../../api/client";
import ChoiceQuiz from "../../shared/components/ChoiceQuiz";
import { levelFromParams } from "../../shared/level";

export default function Grammar() {
  const [searchParams] = useSearchParams();
  // ?review=1 のときは、間違えた問題のうち復習日が来たものだけを出す
  const review = searchParams.get("review") === "1";
  // 難易度はホームで問題を解く前に選ぶ(?level=1〜3。無ければ正答率に合わせて自動)
  const level = levelFromParams(searchParams);
  const fetchQuestion = useCallback(
    (exclude?: string | null) => fetchGrammarQuestion(exclude, review, level),
    [review, level],
  );
  return <ChoiceQuiz fetchQuestion={fetchQuestion} submitAnswer={submitGrammarAnswer} />;
}
