package com.example.backend.wordbook;

import com.example.backend.common.QuestionBankLoader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/** 同梱の単語(resources/questions/wordbook/*.json)。起動時に利用者の単語帳へ入れる・更新する */
@Component
public class BundledWordBank {

  /**
   * 1語分。訳と例文は作成時に決めたもの。
   *
   * @param pos   品詞(v 動詞・adj 形容詞・n 名詞)。4択の誤答を同じ品詞から選ぶのに使う
   * @param level 水準(1 易しい・2 標準。無ければ標準)。易しい語は初期色を青にして、出題を後回しにする
   * @param senses 品詞ごとの主な意味。meaningJa は出題に使う意味(例文での意味)なので、それだけを見て
   *               ほかの品詞・意味が無いと思い込まないよう、一覧と解答後に並べて出す(DB には持たない)
   */
  public record BundledWord(String id, String word, String pos, Integer level, String meaningJa, Example example,
      List<Sense> senses) {

    /** senses を持たない語(テストなど) */
    public BundledWord(String id, String word, String pos, Integer level, String meaningJa, Example example) {
      this(id, word, pos, level, meaningJa, example, List.of());
    }
  }

  /** 品詞(動詞・名詞・形容詞・副詞)ごとの主な意味 */
  public record Sense(String pos, String meaningJa) {
  }

  /** answer は例文中の対象語(変化形のことがある)。ja は例文の訳 */
  public record Example(String en, String answer, String ja) {
  }

  private final List<BundledWord> all;
  /** ID→同梱語と、見出し語(小文字)→同梱語。利用者の単語帳の語から、品詞ごとの意味を引くのに使う */
  private final Map<String, BundledWord> byId;
  private final Map<String, BundledWord> byWord;

  @Autowired
  public BundledWordBank(JsonMapper jsonMapper) {
    this(QuestionBankLoader.load(jsonMapper, "wordbook", BundledWord[].class, BundledWord::id).values());
  }

  /** テスト用。JSON を読まず、渡した語をそのまま使う */
  BundledWordBank(Collection<BundledWord> all) {
    this.all = List.copyOf(all);
    this.byId = this.all.stream().collect(Collectors.toUnmodifiableMap(BundledWord::id, w -> w, (a, b) -> a));
    this.byWord = this.all.stream()
        .collect(Collectors.toUnmodifiableMap(w -> w.word().toLowerCase(Locale.ROOT), w -> w, (a, b) -> a));
  }

  /**
   * 語の品詞ごとの意味。同梱語から入れた語は ID で、利用者が登録した語は見出し語(変化形も同じ語として)で
   * 同梱語を引く。同梱語に無い語は空
   */
  public List<Sense> sensesOf(String bundledId, String word) {
    BundledWord found = bundledId == null ? null : byId.get(bundledId);
    if (found == null && word != null) {
      found = byWord.get(word.toLowerCase(Locale.ROOT));
      if (found == null) {
        found = all.stream().filter(w -> WordForms.sameWord(w.word(), word)).findFirst().orElse(null);
      }
    }
    return found == null || found.senses() == null ? List.of() : found.senses();
  }

  public List<BundledWord> all() {
    return all;
  }

  /**
   * 同梱の内容(語・訳・例文)のハッシュ(先頭16桁)。JSON を直すと変わるので、起動時に前回と比べて
   * 単語帳へ反映するかを決める(版の数字を手で上げ忘れても、直した内容が反映される)
   */
  String contentHash() {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      for (BundledWord item : all) {
        String line = String.join("\u0001", item.id(), item.word(), String.valueOf(item.pos()),
            String.valueOf(item.level()), item.meaningJa(), item.example().en(), item.example().answer(),
            item.example().ja());
        digest.update(line.getBytes(StandardCharsets.UTF_8));
        digest.update((byte) '\n');
      }
      return HexFormat.of().formatHex(digest.digest()).substring(0, 16);
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
