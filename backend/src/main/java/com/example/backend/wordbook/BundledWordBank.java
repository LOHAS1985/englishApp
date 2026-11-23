package com.example.backend.wordbook;

import com.example.backend.common.QuestionBankLoader;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** 同梱の単語(resources/questions/wordbook/*.json)。初回起動時に利用者の単語帳へ入れる */
@Component
public class BundledWordBank {

  /**
   * 1語分。訳と例文は作成時に決めたもの。meaningJa は出題に使う意味(例文での意味)で、
   * senses は品詞ごとの主な意味(出題の意味だけを見て、ほかの品詞・意味が無いと思い込まないように見せる)
   */
  public record BundledWord(String id, String word, String meaningJa, Example example, List<Sense> senses) {
  }

  /** 品詞(動詞・名詞・形容詞・副詞)ごとの主な意味 */
  public record Sense(String pos, String meaningJa) {
  }

  /** answer は例文中の対象語(変化形のことがある)。ja は例文の訳 */
  public record Example(String en, String answer, String ja) {
  }

  private final List<BundledWord> all;
  /** 見出し語(小文字)→同梱語。利用者の単語帳の語から、品詞ごとの意味を引くのに使う */
  private final Map<String, BundledWord> byWord;

  public BundledWordBank(JsonMapper jsonMapper) {
    this.all = List.copyOf(
        QuestionBankLoader.load(jsonMapper, "wordbook", BundledWord[].class, BundledWord::id).values());
    this.byWord = all.stream()
        .collect(Collectors.toUnmodifiableMap(w -> w.word().toLowerCase(Locale.ROOT), w -> w, (a, b) -> a));
  }

  /**
   * 語の品詞ごとの意味。同梱語にある語(利用者が読解から登録した語でも、同梱語と同じなら)だけ返し、
   * 無ければ空。変化形で登録された語(abandoned など)も、同じ語として引く
   */
  public List<Sense> sensesOf(String word) {
    if (word == null) {
      return List.of();
    }
    BundledWord exact = byWord.get(word.toLowerCase(Locale.ROOT));
    BundledWord found = exact != null ? exact
        : all.stream().filter(w -> WordForms.sameWord(w.word(), word)).findFirst().orElse(null);
    return found == null || found.senses() == null ? List.of() : found.senses();
  }

  public List<BundledWord> all() {
    return all;
  }
}
