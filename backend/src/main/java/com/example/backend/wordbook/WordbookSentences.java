package com.example.backend.wordbook;

import java.util.Arrays;
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

  /** 文の終わり(. ! ? の後に閉じ引用符・かっこがあってもよい) */
  private static final Pattern SENTENCE_END = Pattern.compile("[.!?][\"')\u201D\u2019]*$");

  /**
   * 例文として使える英語の1文か。穴埋めの問題文になるので、語の並び(「amicable / cordial / harmonious」のように
   * 解説に書かれた同義語の一覧など)や見出しは使わない。
   * <ul>
   * <li>日本語を含まない・「/」で語を並べていない</li>
   * <li>英語の語が MIN_EXAMPLE_WORDS 語以上</li>
   * <li>大文字(または数字・引用符)で始まり、. ! ? で終わる</li>
   * <li>語をカンマで並べただけではない(カンマが語の数とほぼ同じなら一覧とみなす)</li>
   * </ul>
   */
  static boolean isSentence(String text) {
    if (text == null) {
      return false;
    }
    String t = text.trim();
    if (t.isEmpty() || containsJapanese(t) || t.contains("/")) {
      return false;
    }
    long words = Arrays.stream(t.split("\\s+")).filter(w -> w.chars().anyMatch(Character::isLetter)).count();
    if (words < MIN_EXAMPLE_WORDS) {
      return false;
    }
    char first = t.charAt(0);
    if (!(Character.isUpperCase(first) || Character.isDigit(first) || first == '"' || first == '\'' || first == '\u201C')) {
      return false;
    }
    if (!SENTENCE_END.matcher(t).find()) {
      return false;
    }
    long commas = t.chars().filter(c -> c == ',').count();
    return commas < words - 1;
  }

  /**
   * 日本語の混じった文(文法・語彙の解説など)から、答えの語を含む英語の部分だけを取り出す。
   * 日本語の文字で区切った英語のかたまりのうち、答えを含むものを使い、前後の記号を除く。
   * 英語の部分が文になっていない({@link #isSentence})・答えを含まないときは null(例文なしで登録し、
   * 例文は WordbookEnrichmentService が補う)。日本語を含まない文も、文になっていなければ null
   */
  static String englishPart(String text, String answer) {
    if (text == null || answer == null || answer.isBlank()) {
      return null;
    }
    if (!containsJapanese(text)) {
      String whole = withoutSpeaker(text.trim());
      return isSentence(whole) && contains(whole, answer) ? whole : null;
    }
    for (String chunk : JAPANESE.split(text)) {
      String candidate = withoutSpeaker(
          chunk.replaceAll("^[^A-Za-z0-9\"'(]+", "").replaceAll("[^A-Za-z0-9.!?\"')]+$", "").trim());
      if (contains(candidate, answer) && isSentence(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  /** リスニングの台本の話者名(Man: / Woman 2: / Narrator: など) */
  private static final Pattern SPEAKER = Pattern.compile("^(?:Man|Woman|Narrator|Speaker)(?: \\d)?:\\s*");

  /** 台本から登録した文の頭の話者名を外す(例文は一般的な1文の形にそろえる) */
  static String withoutSpeaker(String text) {
    return SPEAKER.matcher(text).replaceFirst("");
  }

  static String blank(String sentence, String answer) {
    return find(sentence, answer).replaceFirst(BLANK);
  }

  private static Matcher find(String sentence, String answer) {
    Pattern pattern = Pattern.compile("(?i)(?<![A-Za-z])" + Pattern.quote(answer) + "(?![A-Za-z])");
    return pattern.matcher(sentence);
  }
}
