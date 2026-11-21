package com.example.backend.wordbook;

import com.example.backend.common.QuestionBankLoader;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/** 同梱の単語(resources/questions/wordbook/*.json)。起動時に利用者の単語帳へ入れる・更新する */
@Component
public class BundledWordBank {

  /**
   * 1語分。訳と例文は作成時に決めたもの。
   *
   * @param pos   品詞(v 動詞・adj 形容詞・n 名詞)。4択の誤答を同じ品詞から選ぶのに使う
   * @param level 水準(1 易しい・2 標準。無ければ標準)。易しい語は初期色を青にして、出題を後回しにする
   */
  public record BundledWord(String id, String word, String pos, Integer level, String meaningJa, Example example) {
  }

  /** answer は例文中の対象語(変化形のことがある)。ja は例文の訳 */
  public record Example(String en, String answer, String ja) {
  }

  private final List<BundledWord> all;

  @Autowired
  public BundledWordBank(JsonMapper jsonMapper) {
    this.all = List.copyOf(
        QuestionBankLoader.load(jsonMapper, "wordbook", BundledWord[].class, BundledWord::id).values());
  }

  /** テスト用。JSON を読まず、渡した語をそのまま使う */
  BundledWordBank(List<BundledWord> all) {
    this.all = List.copyOf(all);
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
