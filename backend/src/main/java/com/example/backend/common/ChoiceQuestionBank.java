package com.example.backend.common;

import com.example.backend.grammar.dto.GrammarChoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** 短文の空所に4択で答える問題(文法・語彙)の問題集 */
public class ChoiceQuestionBank {

  private static final Logger logger = LoggerFactory.getLogger(ChoiceQuestionBank.class);

  /** JSON の1問分。difficulty(1〜3)は省略可(省略時は Difficulty が推定する) */
  public record ChoiceQuestion(
      String id,
      String point,
      Integer difficulty,
      String sentence,
      List<GrammarChoice> choices,
      String answer,
      String explanation,
      String translation) {
  }

  private final Map<String, ChoiceQuestion> byId;
  private final List<ChoiceQuestion> all;
  private final Map<String, Integer> difficulty;

  public ChoiceQuestionBank(JsonMapper jsonMapper, String feature) {
    this.byId = QuestionBankLoader.load(jsonMapper, feature, ChoiceQuestion[].class, ChoiceQuestion::id);
    this.all = new ArrayList<>(byId.values());
    this.difficulty = Difficulty.assign(all, ChoiceQuestion::id, ChoiceQuestion::difficulty, q -> feature,
        Difficulty::grammarScore);
    logger.info("{} question bank loaded: {} questions", feature, all.size());
  }

  /** 出題候補の ID(どれを出すかは QuestionSelector が解答履歴から決める) */
  public List<String> ids() {
    return all.stream().map(ChoiceQuestion::id).toList();
  }

  /** 難易度(1=基礎 / 2=標準 / 3=発展) */
  public int difficulty(String id) {
    return difficulty.getOrDefault(id, Difficulty.NORMAL);
  }

  public Optional<ChoiceQuestion> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  public List<ChoiceQuestion> all() {
    return List.copyOf(all);
  }
}
