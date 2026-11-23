package com.example.backend.wordbook;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** 穴埋め用の英文。対象語の最初の出現を空欄にする */
final class WordbookSentences {

  static final String BLANK = "_____";

  private WordbookSentences() {
  }

  /** 対象語が文中に(単語として)含まれるか。大文字小文字は問わない */
  static boolean contains(String sentence, String answer) {
    return find(sentence, answer).find();
  }

  /** 答えの頭文字と文字数(例: abandoned → a________ (9文字)) */
  static String hint(String answer) {
    if (answer == null || answer.isEmpty()) {
      return "";
    }
    return answer.charAt(0) + "_".repeat(answer.length() - 1) + " (" + answer.length() + "文字)";
  }

  /** ひらがな・カタカナ・漢字・全角記号(「」。、など)。英文の例文に入っていてはいけない文字 */
  private static final Pattern JAPANESE = Pattern.compile("[\\u3000-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef]");

  /** 英文として使えない(日本語を含む)か */
  static boolean containsJapanese(String text) {
    return text != null && JAPANESE.matcher(text).find();
  }

  /** 例文として残す最小の語数(語だけ・語句だけでは穴埋めにならない) */
  static final int MIN_EXAMPLE_WORDS = 4;

  /**
   * 日本語の混じった文(文法・語彙の解説など)から、答えの語を含む英語の部分だけを取り出す。
   * 日本語の文字で区切った英語のかたまりのうち、答えを含むものを使い、前後の記号を除く。
   * 英語の部分が短すぎる(MIN_EXAMPLE_WORDS 語未満)・答えを含まないときは null(例文なしで登録する)。
   * 日本語を含まない文はそのまま返す
   */
  static String englishPart(String text, String answer) {
    if (text == null || answer == null || answer.isBlank()) {
      return null;
    }
    if (!containsJapanese(text)) {
      return text.trim();
    }
    for (String chunk : JAPANESE.split(text)) {
      String candidate = chunk.replaceAll("^[^A-Za-z0-9\"'(]+", "").replaceAll("[^A-Za-z0-9.!?\"')]+$", "").trim();
      if (contains(candidate, answer) && candidate.split("\\s+").length >= MIN_EXAMPLE_WORDS) {
        return candidate;
      }
    }
    return null;
  }

  static String blank(String sentence, String answer) {
    return find(sentence, answer).replaceFirst(BLANK);
  }

  private static Matcher find(String sentence, String answer) {
    Pattern pattern = Pattern.compile("(?i)(?<![A-Za-z])" + Pattern.quote(answer) + "(?![A-Za-z])");
    return pattern.matcher(sentence);
  }
}
