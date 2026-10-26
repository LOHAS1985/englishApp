package com.example.backend.vocab;

import com.example.backend.common.ChoiceQuestionBank;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** 英検準1級 大問1・TOEIC 語彙問題の問題集(resources/questions/vocab/*.json) */
@Component
public class VocabQuestionBank extends ChoiceQuestionBank {

  public VocabQuestionBank(JsonMapper jsonMapper) {
    super(jsonMapper, "vocab");
  }
}
