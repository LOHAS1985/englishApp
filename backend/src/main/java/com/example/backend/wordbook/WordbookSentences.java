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

  static String blank(String sentence, String answer) {
    return find(sentence, answer).replaceFirst(BLANK);
  }

  private static Matcher find(String sentence, String answer) {
    Pattern pattern = Pattern.compile("(?i)(?<![A-Za-z])" + Pattern.quote(answer) + "(?![A-Za-z])");
    return pattern.matcher(sentence);
  }
}
