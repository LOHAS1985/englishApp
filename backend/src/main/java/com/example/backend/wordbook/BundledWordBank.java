package com.example.backend.wordbook;

import com.example.backend.common.QuestionBankLoader;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

/** 同梱の単語(resources/questions/wordbook/*.json)。初回起動時に利用者の単語帳へ入れる */
@Component
public class BundledWordBank {

  /** 1語分。訳と例文は作成時に決めたもの */
  public record BundledWord(String id, String word, String meaningJa, Example example) {
  }

  /** answer は例文中の対象語(変化形のことがある)。ja は例文の訳 */
  public record Example(String en, String answer, String ja) {
  }

  private final List<BundledWord> all;

  public BundledWordBank(JsonMapper jsonMapper) {
    this.all = List.copyOf(
        QuestionBankLoader.load(jsonMapper, "wordbook", BundledWord[].class, BundledWord::id).values());
  }

  public List<BundledWord> all() {
    return all;
  }
}
