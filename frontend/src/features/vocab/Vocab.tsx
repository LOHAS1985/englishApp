import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchVocabQuestion, submitVocabAnswer } from "../../api/client";
import ChoiceQuiz from "../../shared/components/ChoiceQuiz";

export default function Vocab() {
  // ?review=1 のときは、間違えた問題のうち復習日が来たものだけを出す
  const review = useSearchParams()[0].get("review") === "1";
  const fetchQuestion = useCallback(
    (exclude?: string | null) => fetchVocabQuestion(exclude, review),
    [review],
  );
  return (
    <ChoiceQuiz
      eyebrow={review ? "VOCABULARY REVIEW" : "VOCABULARY"}
      title={review ? "語彙の復習" : "語彙問題(英検準1級・TOEIC)"}
      fetchQuestion={fetchQuestion}
      submitAnswer={submitVocabAnswer}
    />
  );
}
