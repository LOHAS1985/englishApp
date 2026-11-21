package com.example.backend.wordbook;

import com.example.backend.wordbook.BundledWordBank.BundledWord;
import com.example.backend.wordbook.BundledWordBank.Example;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 同梱の単語帳(questions/wordbook)の形式チェック。語を追加・修正したら CI で検証される。
 * 穴埋めの答えが例文に1回だけ入ること、同じ語が重ならないことを確かめる。
 */
class BundledWordsTests {

  private static final JsonMapper MAPPER = JsonMapper.builder().build();
  private static final Pattern WORD = Pattern.compile("[a-z][a-z'-]*");

  private final List<BundledWord> all = new BundledWordBank(MAPPER).all();

  @Test
  void bundledListHasFiveHundredWords() {
    assertThat(all).hasSize(500);
  }

  @Test
  void idsAreSequentialFromW0001() {
    for (int i = 0; i < all.size(); i++) {
      assertThat(all.get(i).id()).isEqualTo(String.format("w%04d", i + 1));
    }
  }

  @Test
  void wordsAreUniqueSingleEnglishWords() {
    Set<String> seen = new HashSet<>();
    for (BundledWord item : all) {
      assertThat(item.word()).as(item.id()).matches(WORD);
      assertThat(seen.add(item.word().toLowerCase())).as("重複: " + item.word()).isTrue();
    }
  }

  @Test
  void meaningAndExampleAreFilled() {
    for (BundledWord item : all) {
      assertThat(item.meaningJa()).as(item.id()).isNotBlank();
      assertThat(item.example()).as(item.id()).isNotNull();
      assertThat(item.example().en()).as(item.id()).isNotBlank();
      assertThat(item.example().ja()).as(item.id()).isNotBlank();
      assertThat(item.example().answer()).as(item.id()).isNotBlank();
    }
  }

  @Test
  void answerAppearsExactlyOnceInTheSentenceAndIsAFormOfTheWord() {
    for (BundledWord item : all) {
      Example ex = item.example();
      Pattern answer = Pattern.compile("(?i)(?<![A-Za-z])" + Pattern.quote(ex.answer()) + "(?![A-Za-z])");
      var matcher = answer.matcher(ex.en());
      int count = 0;
      while (matcher.find()) {
        count++;
      }
      assertThat(count).as(item.id() + " 答えが例文に1回だけ入ること").isEqualTo(1);
      assertThat(WordForms.sameWord(item.word(), ex.answer()))
          .as(item.id() + " 答えは見出し語の変化形であること").isTrue();
    }
  }

  @Test
  void sentencesAreNotTooShortOrTooLong() {
    for (BundledWord item : all) {
      int words = item.example().en().trim().split("\s+").length;
      assertThat(words).as(item.id()).isBetween(9, 25);
    }
  }

  @Test
  void everyWordHasAPartOfSpeechAndALevel() {
    int easy = 0;
    for (BundledWord item : all) {
      assertThat(item.pos()).as(item.id() + " 品詞").isIn("v", "adj", "n");
      if (item.level() != null) {
        assertThat(item.level()).as(item.id() + " 水準").isIn(1, 2);
      }
      if (item.level() != null && item.level() == 1) {
        easy++;
      }
      // 動詞の訳は「を〜」「〜する」、形容詞の訳は「〜な」などの形(品詞の付け間違いに気づくため)
      String first = item.meaningJa().split("、")[0];
      if (item.pos().equals("v")) {
        assertThat(first).as(item.id() + " 動詞の訳").matches("^(を|に|と|から|[(（]).*|.*(する|る|う|く|む|ぶ|す|つ|ぬ|ぐ)$");
      }
    }
    // 易しい語は初期色を青にして出題を後回しにする。多すぎると単語帳が痩せる
    assertThat(easy).as("易しい語の数").isBetween(60, 200);
  }

  @Test
  void noTwoWordsShareTheSameBlankedSentence() {
    // 同じ空欄の文が2つあると、どちらの語を入れても正解になってしまい、穴埋めで答えが決まらない
    Set<String> seen = new HashSet<>();
    for (BundledWord item : all) {
      Example ex = item.example();
      String blanked = ex.en().replaceFirst("(?i)(?<![A-Za-z])" + Pattern.quote(ex.answer()) + "(?![A-Za-z])", "_____");
      assertThat(seen.add(blanked.toLowerCase())).as(item.id() + " 空欄にした文が別の語と同じ: " + blanked).isTrue();
    }
  }
}
