package com.example.backend.reading;

import com.example.backend.common.QuestionSetBank;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * 読解問題集(resources/questions/reading/*.json)。
 * type: toeic-part6(長文穴埋め) / toeic-part7(読解) / eiken-cloze(英検 大問2) / eiken-long(英検 大問3)
 */
@Component
public class ReadingQuestionBank extends QuestionSetBank {

  public ReadingQuestionBank(JsonMapper jsonMapper) {
    super(jsonMapper, "reading");
  }
}
