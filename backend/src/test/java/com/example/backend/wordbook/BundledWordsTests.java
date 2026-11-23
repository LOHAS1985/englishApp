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

  /** 品詞ごとの主な意味。出題の意味だけを見て、ほかの品詞・意味が無いと思い込まないように見せる */
  @Test
  void everyWordHasSensesByPartOfSpeech() {
    Set<String> allowed = Set.of("動詞", "名詞", "形容詞", "副詞");
    for (BundledWord w : all) {
      assertThat(w.senses()).as(w.word()).isNotEmpty();
      Set<String> seen = new HashSet<>();
      for (BundledWordBank.Sense sense : w.senses()) {
        assertThat(sense.pos()).as(w.word()).isIn(allowed);
        // 同じ品詞は1つにまとめる(画面で同じ見出しが2回出ないように)
        assertThat(seen.add(sense.pos())).as(w.word() + " の " + sense.pos()).isTrue();
        assertThat(sense.meaningJa()).as(w.word()).isNotBlank();
      }
    }
  }

  @Test
  void sensesAreFoundByHeadwordAndInflectedForm() {
    BundledWordBank bank = new BundledWordBank(MAPPER);
    // remedy は名詞と動詞の両方で使う(出題の意味は名詞)
    assertThat(bank.sensesOf("remedy")).extracting(BundledWordBank.Sense::pos).containsExactly("名詞", "動詞");
    assertThat(bank.sensesOf("Remedy")).hasSize(2);
    // 変化形で登録した語も同じ語として引く
    assertThat(bank.sensesOf("abandoned")).isEqualTo(bank.sensesOf("abandon"));
    // 同梱語に無い語は空
    assertThat(bank.sensesOf("zzzz")).isEmpty();
    assertThat(bank.sensesOf(null)).isEmpty();
  }
}
