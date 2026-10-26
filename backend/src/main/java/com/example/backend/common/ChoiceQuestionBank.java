package com.example.backend.common;

import com.example.backend.grammar.dto.GrammarChoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/** 短文の空所に4択で答える問題(文法・語彙)の問題集 */
public class ChoiceQuestionBank {

  private static final Logger logger = LoggerFactory.getLogger(ChoiceQuestionBank.class);

  /** JSON の1問分 */
  public record ChoiceQuestion(
      String id,
      String point,
      String sentence,
      List<GrammarChoice> choices,
      String answer,
      String explanation,
      String translation) {
  }

  private final Map<String, ChoiceQuestion> byId;
  private final List<ChoiceQuestion> all;

  public ChoiceQuestionBank(JsonMapper jsonMapper, String feature) {
    this.byId = QuestionBankLoader.load(jsonMapper, feature, ChoiceQuestion[].class, ChoiceQuestion::id);
    this.all = new ArrayList<>(byId.values());
    logger.info("{} question bank loaded: {} questions", feature, all.size());
  }

  public ChoiceQuestion random() {
    if (all.isEmpty()) {
      throw new IllegalStateException("問題が登録されていません");
    }
    return all.get(ThreadLocalRandom.current().nextInt(all.size()));
  }

  public Optional<ChoiceQuestion> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  public List<ChoiceQuestion> all() {
    return List.copyOf(all);
  }
}
