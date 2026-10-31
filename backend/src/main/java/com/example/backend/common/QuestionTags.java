package com.example.backend.common;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * 弱点の集計に使う分類。問題集に分類を書き足さなくても済むよう、既存の項目から機械的に決める。
 * <ul>
 * <li>文法:問題ごとの {@code point}(例:「関係代名詞(前置詞+which)」)を十数分野にまとめる</li>
 * <li>読解・リスニング:設問文の言い回し(NOT・most likely・mean when she says など)から設問タイプを決める</li>
 * </ul>
 */
public final class QuestionTags {

  public static final String OTHER = "その他";

  private QuestionTags() {
  }

  /** point の部分一致で分野を決める。上から順に判定するので、より具体的な規則を先に置く */
  private static final List<String[]> GRAMMAR_RULES = List.of(
      new String[] { "仮定法", "仮定法" },
      new String[] { "倒置", "倒置" },
      new String[] { "紛らわしい", "品詞・語形" },
      new String[] { "関係", "関係詞" },
      new String[] { "前置詞と接続詞", "前置詞と接続詞の区別" },
      new String[] { "語彙", "語彙・コロケーション" },
      new String[] { "コロケーション", "語彙・コロケーション" },
      new String[] { "群動詞", "語彙・コロケーション" },
      new String[] { "受動態", "動詞の形・語法" },
      new String[] { "使役", "動詞の形・語法" },
      new String[] { "分詞構文", "準動詞(不定詞・動名詞・分詞)" },
      new String[] { "不定詞", "準動詞(不定詞・動名詞・分詞)" },
      new String[] { "動名詞", "準動詞(不定詞・動名詞・分詞)" },
      // 「動詞の形(have + O + 過去分詞)」は語法の問題なので、「分詞」より先に判定する
      new String[] { "動詞の形", "動詞の形・語法" },
      new String[] { "分詞", "準動詞(不定詞・動名詞・分詞)" },
      new String[] { "時制", "時制" },
      new String[] { "比較", "比較" },
      new String[] { "品詞", "品詞・語形" },
      new String[] { "一致", "動詞の形・語法" },
      new String[] { "動詞", "動詞の形・語法" },
      new String[] { "語法", "動詞の形・語法" },
      new String[] { "助動詞", "動詞の形・語法" },
      new String[] { "接続", "接続詞" },
      new String[] { "前置詞", "前置詞" },
      new String[] { "代名詞", "代名詞・数量詞" },
      new String[] { "数量", "代名詞・数量詞" },
      new String[] { "限定詞", "代名詞・数量詞" },
      new String[] { "名詞", "語彙・コロケーション" },
      new String[] { "形容詞", "語彙・コロケーション" },
      new String[] { "副詞", "語彙・コロケーション" });

  public static String grammarCategory(String point) {
    if (point == null) {
      return OTHER;
    }
    for (String[] rule : GRAMMAR_RULES) {
      if (point.contains(rule[0])) {
        return rule[1];
      }
    }
    return OTHER;
  }

  /** 語彙問題は point に品詞(動詞・形容詞・名詞・句動詞)が入っている。「形容詞(ビジネス)」は形容詞にまとめる */
  public static String vocabCategory(String point) {
    if (point == null || point.isBlank()) {
      return OTHER;
    }
    int paren = point.indexOf('(');
    return paren > 0 ? point.substring(0, paren) : point;
  }

  private static final Pattern QUOTED_REMARK = Pattern.compile("(mean|imply|say|says|write|writes)[^\"“]*[\"“]");
  private static final Pattern YES_NO_START = Pattern.compile(
      "^(do|does|did|is|are|was|were|can|could|will|would|have|has|had|should|may|shall)\\b");
  private static final Pattern NEGATIVE_START = Pattern.compile(
      "^(don't|doesn't|didn't|isn't|aren't|wasn't|weren't|can't|couldn't|won't|wouldn't|haven't|hasn't|hadn't|shouldn't)\\b");
  private static final Pattern TAG_QUESTION = Pattern.compile(
      ",\\s*(don't|doesn't|didn't|isn't|aren't|wasn't|weren't|can't|won't|haven't|hasn't|shouldn't|do|does|did|is|are|will|have|has)\\s+\\w+\\?$");
  private static final Pattern OPINION = Pattern.compile(
      "\\b(experts?|researchers?|scientists?|critics?|supporters?|economists?|the author|some people|many people"
          + "|governments?)\\b.*\\b(suggest|recommend|believe|think|say|argue|emphasize|claim|hope|warn|propose)s?\\b");
  private static final Pattern WH_START = Pattern.compile("^(what|what's|where|where's|when|when's|who|who's|whose|why|how|how's|which)\\b");

  /**
   * 読解・リスニングの設問タイプ。
   *
   * @param type     セットの形式(toeic-part7 など)
   * @param question 設問文。Part 6・英検 大問2 は空所番号("[1]")
   * @param choices  選択肢(Part 6 の文挿入・語形問題の判定に使う)
   */
  public static String setQuestionType(String type, String question, List<String> choices) {
    String q = question == null ? "" : question.trim();
    String lower = q.toLowerCase(Locale.ROOT);
    if ("toeic-part2".equals(type)) {
      return part2Form(lower);
    }
    if ("toeic-part6".equals(type)) {
      return part6Type(choices);
    }
    if ("eiken-cloze".equals(type)) {
      return "空所補充(文脈)";
    }
    if ("eiken-part3".equals(type)) {
      // 英検 Part 3 はすべて「What should you do?」なので、問い方では分けられない
      return "状況に合う行動";
    }
    if (lower.startsWith("look at the graphic")) {
      return "図表";
    }
    if (lower.contains("best belong") || lower.contains("[1], [2], [3], and [4]")) {
      return "文挿入";
    }
    if (QUOTED_REMARK.matcher(lower).find()) {
      return "発言の意図";
    }
    if (q.contains(" NOT ")) {
      return "NOT問題";
    }
    if (lower.contains("closest in meaning")) {
      return "同義語";
    }
    if (lower.contains("purpose") || lower.contains("mainly about") || lower.contains("main topic")
        || lower.contains("mainly discussing") || lower.matches("^why (did|does|is) .* (write|writing|written).*")) {
      return "主旨・目的";
    }
    if (lower.contains("most likely") || lower.contains("suggested") || lower.contains("implied")
        || lower.contains("imply") || lower.contains("infer") || lower.contains("probably")) {
      return "推測";
    }
    if (lower.contains("true about") || lower.contains("indicated") || lower.contains("mentioned about")
        || lower.contains("stated about") || lower.startsWith("which of the following")) {
      return "内容一致";
    }
    if (lower.contains("next") || lower.matches(".*\\bwill (the )?\\w+( \\w+)? do\\b.*")) {
      return "次の行動・予定";
    }
    // 以下は英検の長文・リスニングに多い問い方
    if (lower.matches("^why does the (author|passage|speaker) mention.*") || lower.contains("example of")
        || lower.matches(".*\\bshow\\??$")) {
      return "具体例の役割";
    }
    if (OPINION.matcher(lower).find() || lower.startsWith("according to")) {
      return "主張・意見";
    }
    if (lower.startsWith("why")) {
      return "理由";
    }
    if (lower.matches(".*\\b(advantage|benefit|problem|challenge|drawback|disadvantage|concern|risk)s?\\b.*")) {
      return "利点・問題点";
    }
    return "詳細";
  }

  /** TOEIC Part 2 は問いかけの形で苦手が分かれる(疑問詞・Yes/No・否定/付加・選択・平叙文) */
  static String part2Form(String lower) {
    if (lower.matches(".*\\bor\\b.*\\?$") && !lower.startsWith("who") && !lower.startsWith("what")) {
      return "選択疑問文";
    }
    if (NEGATIVE_START.matcher(lower).find() || TAG_QUESTION.matcher(lower).find()) {
      return "否定・付加疑問文";
    }
    if (WH_START.matcher(lower).find()) {
      return "疑問詞の疑問文";
    }
    if (YES_NO_START.matcher(lower).find()) {
      return lower.startsWith("would you") || lower.startsWith("could you") || lower.startsWith("can you")
          || lower.startsWith("why don't") ? "依頼・提案" : "Yes/No 疑問文";
    }
    if (lower.startsWith("let's") || lower.startsWith("why don't") || lower.startsWith("how about")) {
      return "依頼・提案";
    }
    return "平叙文";
  }

  /** Part 6 の空所:文の選択肢なら文挿入、同じ語幹の語形が並べば語形(文法)、それ以外は語彙・つなぎ語 */
  static String part6Type(List<String> choices) {
    if (choices == null || choices.isEmpty()) {
      return "空所(語彙・接続)";
    }
    long sentences = choices.stream().filter(c -> c.trim().split("\\s+").length >= 4).count();
    if (sentences >= 3) {
      return "文挿入";
    }
    String first = choices.get(0).trim().toLowerCase(Locale.ROOT);
    int stem = Math.min(4, first.length());
    boolean sameStem = stem >= 4 && choices.stream()
        .allMatch(c -> c.trim().toLowerCase(Locale.ROOT).startsWith(first.substring(0, stem)));
    return sameStem ? "空所(語形・文法)" : "空所(語彙・接続)";
  }
}
