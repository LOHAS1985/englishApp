import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchGrammarQuestion, submitGrammarAnswer } from "../../api/client";
import ChoiceQuiz from "../../shared/components/ChoiceQuiz";

export default function Grammar() {
  // ?review=1 のときは、間違えた問題のうち復習日が来たものだけを出す
  const review = useSearchParams()[0].get("review") === "1";
  const fetchQuestion = useCallback(
    (exclude?: string | null) => fetchGrammarQuestion(exclude, review),
    [review],
  );
  return (
    <ChoiceQuiz
      eyebrow={review ? "TOEIC GRAMMAR REVIEW" : "TOEIC GRAMMAR"}
      title={review ? "文法の復習" : "文法問題"}
      fetchQuestion={fetchQuestion}
      submitAnswer={submitGrammarAnswer}
    />
  );
}
