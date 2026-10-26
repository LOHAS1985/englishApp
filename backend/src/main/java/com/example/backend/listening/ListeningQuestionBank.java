package com.example.backend.listening;

import com.example.backend.common.QuestionSetBank;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * リスニング問題集(resources/questions/listening/*.json)。script を TtsService で音声化して出題する。
 * type: toeic-part3(会話) / toeic-part4(説明文) / eiken-part1(会話) / eiken-part2(説明文) / eiken-part3(Real-Life)
 */
@Component
public class ListeningQuestionBank extends QuestionSetBank {

  public ListeningQuestionBank(JsonMapper jsonMapper) {
    super(jsonMapper, "listening");
  }
}
