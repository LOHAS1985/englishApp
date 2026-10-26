import { fetchGrammarQuestion, submitGrammarAnswer } from "../../api/client";
import ChoiceQuiz from "../../shared/components/ChoiceQuiz";

export default function Grammar() {
  return (
    <ChoiceQuiz
      eyebrow="TOEIC GRAMMAR"
      title="文法問題"
      fetchQuestion={fetchGrammarQuestion}
      submitAnswer={submitGrammarAnswer}
    />
  );
}
