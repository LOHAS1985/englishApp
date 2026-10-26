package com.example.backend.grammar;

import com.example.backend.common.ChoiceQuestionBank;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/** TOEIC Part 5 形式の文法問題集(resources/questions/grammar/*.json) */
@Component
public class GrammarQuestionBank extends ChoiceQuestionBank {

  public GrammarQuestionBank(JsonMapper jsonMapper) {
    super(jsonMapper, "grammar");
  }
}
