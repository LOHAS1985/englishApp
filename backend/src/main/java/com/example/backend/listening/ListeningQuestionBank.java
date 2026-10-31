package com.example.backend.listening;

import com.example.backend.common.QuestionSetBank;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

/**
 * リスニング問題集(resources/questions/listening/*.json)。script を TtsService で音声化して出題する。
 * type: toeic-part2(応答) / toeic-part3(会話) / toeic-part4(説明文) / eiken-part1(会話) / eiken-part2(説明文)
 * / eiken-part3(Real-Life)
 */
@Component
public class ListeningQuestionBank extends QuestionSetBank {

  public static final String TOEIC_PART2 = "toeic-part2";

  public ListeningQuestionBank(JsonMapper jsonMapper) {
    super(jsonMapper, "listening", ListeningQuestionBank::withPart2Script);
  }

  /**
   * TOEIC Part 2 は問いかけと3つの応答をすべて音声で流すので、台本を設問から組み立てる。
   * JSON に台本を書かないのは、balance.py で選択肢を並べ替えても台本の (A)〜(C) とずれないようにするため。
   */
  static QuestionSet withPart2Script(QuestionSet set) {
    if (!TOEIC_PART2.equals(set.type()) || set.questions() == null) {
      return set;
    }
    StringBuilder script = new StringBuilder();
    List<SetQuestion> questions = set.questions();
    for (int i = 0; i < questions.size(); i++) {
      SetQuestion q = questions.get(i);
      // 問いかけと応答で声を変え、問題ごとに男女を入れ替える
      String asker = i % 2 == 0 ? "Woman" : "Man";
      String responder = i % 2 == 0 ? "Man" : "Woman";
      if (i > 0) {
        script.append('\n');
      }
      script.append("Narrator: Number ").append(i + 1).append(".\n");
      script.append(asker).append(": ").append(q.question());
      for (int c = 0; c < q.choices().size(); c++) {
        script.append('\n').append(responder).append(": (").append((char) ('A' + c)).append(") ")
            .append(q.choices().get(c));
      }
    }
    return new QuestionSet(set.id(), set.type(), set.title(), set.passage(), script.toString(), set.situation(),
        set.graphic(), set.translation(), questions);
  }
}
