import { fetchVocabQuestion, submitVocabAnswer } from "../../api/client";
import ChoiceQuiz from "../../shared/components/ChoiceQuiz";

export default function Vocab() {
  return (
    <ChoiceQuiz
      eyebrow="VOCABULARY"
      title="語彙問題(英検準1級・TOEIC)"
      fetchQuestion={fetchVocabQuestion}
      submitAnswer={submitVocabAnswer}
    />
  );
}
