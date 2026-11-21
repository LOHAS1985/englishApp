package com.example.backend.wordbook;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WordFormsTests {

  @Test
  void regularInflectionsAreTheSameWord() {
    assertThat(WordForms.sameWord("abandon", "abandoned")).isTrue();
    assertThat(WordForms.sameWord("abandon", "abandons")).isTrue();
    assertThat(WordForms.sameWord("abandon", "abandoning")).isTrue();
    assertThat(WordForms.sameWord("make", "making")).isTrue();
    assertThat(WordForms.sameWord("study", "studied")).isTrue();
    assertThat(WordForms.sameWord("stop", "stopped")).isTrue();
  }

  @Test
  void irregularInflectionsAreTheSameWordInBothDirections() {
    assertThat(WordForms.sameWord("run", "ran")).isTrue();
    assertThat(WordForms.sameWord("ran", "run")).isTrue();
    assertThat(WordForms.sameWord("go", "went")).isTrue();
    assertThat(WordForms.sameWord("child", "children")).isTrue();
  }

  @Test
  void differentWordsAreNotTheSame() {
    assertThat(WordForms.sameWord("abandon", "abandonment")).isFalse();
    assertThat(WordForms.sameWord("lie", "lay")).isFalse();
    assertThat(WordForms.sameWord("run", "rune")).isFalse();
  }

  @Test
  void answerAcceptsAnyFormOfTheWord() {
    // 例文中の形が ran でも、run の別の形(runs・running・原形)は正解にする
    assertThat(WordForms.matchesAnswer("run", "run", "ran")).isTrue();
    assertThat(WordForms.matchesAnswer("running", "run", "ran")).isTrue();
    assertThat(WordForms.matchesAnswer("  Ran ", "run", "ran")).isTrue();
    assertThat(WordForms.matchesAnswer("abandon", "abandon", "abandoned")).isTrue();
    assertThat(WordForms.matchesAnswer("abandoned", "abandon", "abandoned")).isTrue();
  }

  @Test
  void answerRejectsOtherWordsAndEmptyInput() {
    assertThat(WordForms.matchesAnswer("abandonment", "abandon", "abandoned")).isFalse();
    assertThat(WordForms.matchesAnswer("", "abandon", "abandoned")).isFalse();
    assertThat(WordForms.matchesAnswer(null, "abandon", "abandoned")).isFalse();
    assertThat(WordForms.matchesAnswer("stay", "abandon", "abandoned")).isFalse();
  }

  @Test
  void normalizeIgnoresCaseSpacesAndTrailingPunctuation() {
    assertThat(WordForms.normalize("  Hello. ")).isEqualTo("hello");
    assertThat(WordForms.normalize("a   b")).isEqualTo("a b");
  }

  @Test
  void phrasesAreNotInflected() {
    assertThat(WordForms.inflectionsOf("take off")).containsExactly("take off");
    assertThat(WordForms.sameWord("take off", "took off")).isFalse();
  }

  @Test
  void ingNounsAreSeparateWordsFromTheVerbTheyComeFrom() {
    // mean を登録済みでも meaning、meet を登録済みでも meeting は別の語として登録できる
    assertThat(WordForms.sameWord("mean", "meaning")).isFalse();
    assertThat(WordForms.sameWord("meaning", "mean")).isFalse();
    assertThat(WordForms.sameWord("meet", "meeting")).isFalse();
    assertThat(WordForms.sameWord("build", "building")).isFalse();
    assertThat(WordForms.sameWord("understand", "understanding")).isFalse();
    // 普通の -ing 形は、これまでどおり変化形
    assertThat(WordForms.sameWord("run", "running")).isTrue();
    assertThat(WordForms.sameWord("abandon", "abandoning")).isTrue();
    assertThat(WordForms.sameWord("make", "making")).isTrue();
    // meaning 自身の変化形(複数形)は同じ語
    assertThat(WordForms.sameWord("meaning", "meanings")).isTrue();
    // 他の変化形は変わらない
    assertThat(WordForms.sameWord("mean", "meant")).isTrue();
    assertThat(WordForms.sameWord("meet", "met")).isTrue();
  }

  @Test
  void normalizeCollapsesAnyWhitespace() {
    assertThat(WordForms.normalize("a \t\n b")).isEqualTo("a b");
  }
}
