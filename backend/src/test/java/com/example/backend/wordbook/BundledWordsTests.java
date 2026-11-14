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
}
