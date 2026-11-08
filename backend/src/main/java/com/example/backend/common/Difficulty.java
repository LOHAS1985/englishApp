package com.example.backend.common;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;

/**
 * 問題の難易度(1=基礎 / 2=標準 / 3=発展)と、正答率に応じた出し分けの目標。
 * <ul>
 * <li>問題集の JSON に {@code difficulty} があればそれを使う(語彙は語ごとに判定して書いてある)</li>
 * <li>無ければ、文の長さ・文法分野・設問タイプから「難しさの点数」を出し、形式ごとに3等分して振る。
 * 点数は形式内の相対的な順位にだけ使うので、形式をまたいだ尺度の違いは気にしなくてよい</li>
 * </ul>
 */
public final class Difficulty {

  public static final int EASY = 1;
  public static final int NORMAL = 2;
  public static final int HARD = 3;
  /** 問題集の JSON に書ける難易度の最大(1=基礎 / 2=標準 / 3=発展 / 4=難関 / 5=最難関)。自動推定は 1〜3 のまま */
  public static final int MAX_LEVEL = 5;

  /** 目標を決めるのに使う直近の設問数と、これ未満なら目標を決めない(標準的な出題のまま)数 */
  static final int RECENT_ANSWERS = 30;
  static final int MIN_ANSWERS = 8;
  /** 直近の正答率がこれ以上なら発展、BASIC_BELOW 未満なら基礎を中心に出す */
  static final double HARD_FROM = 0.85;
  static final double BASIC_BELOW = 0.6;

  private Difficulty() {
  }

  /**
   * @param explicit JSON に書かれた難易度(無ければ null)
   * @param group    3等分する単位(セット問題は形式ごと)
   * @param score    難しさの点数(大きいほど難しい)
   */
  static <T> Map<String, Integer> assign(List<T> items, Function<T, String> id, Function<T, Integer> explicit,
      Function<T, String> group, ToDoubleFunction<T> score) {
    Map<String, Integer> result = new HashMap<>();
    Map<String, List<T>> estimated = new LinkedHashMap<>();
    for (T item : items) {
      Integer d = explicit.apply(item);
      if (d != null) {
        result.put(id.apply(item), Math.max(EASY, Math.min(MAX_LEVEL, d)));
      } else {
        estimated.computeIfAbsent(group.apply(item), k -> new ArrayList<>()).add(item);
      }
    }
    for (List<T> list : estimated.values()) {
      List<T> sorted = new ArrayList<>(list);
      sorted.sort(Comparator.comparingDouble(score));
      for (int i = 0; i < sorted.size(); i++) {
        result.put(id.apply(sorted.get(i)), EASY + i * 3 / sorted.size());
      }
    }
    return result;
  }

  private static final List<String> ADVANCED_EXPRESSIONS = List.of("lest", "notwithstanding", "inasmuch", "albeit",
      "whereby", "whereupon", "pursuant", "dint", "lieu", "contingent", "barring", "save for", "pending", "amid",
      "provided that", "in the event", "no sooner", "hardly", "but for", "were it not");

  /** 文法:分野の重み(倒置・仮定法・紛らわしい語形は難しい、品詞は易しい)+高度な表現+文の長さ */
  static double grammarScore(ChoiceQuestion q) {
    String point = q.point() == null ? "" : q.point();
    double score = switch (QuestionTags.grammarCategory(point)) {
      case "仮定法", "倒置" -> 30;
      case "関係詞", "準動詞(不定詞・動名詞・分詞)", "前置詞と接続詞の区別" -> 15;
      case "品詞・語形", "代名詞・数量詞" -> 0;
      default -> 10;
    };
    String lowerPoint = point.toLowerCase();
    if (point.contains("紛らわしい")) {
      score += 25;
    }
    if (ADVANCED_EXPRESSIONS.stream().anyMatch(lowerPoint::contains)) {
      score += 15;
    }
    return score + words(q.sentence()) * 0.5;
  }

  /** 推測・発言の意図など、本文の言い換えや行間を読む必要がある設問タイプ */
  private static final Set<String> HARD_QUESTION_TYPES = Set.of("推測", "NOT問題", "発言の意図", "文挿入", "図表",
      "主張・意見", "具体例の役割", "否定・付加疑問文", "平叙文", "選択疑問文", "空所(語彙・接続)");

  /** セット問題:本文(台本)の長さ+難しい設問タイプの割合+複数文書・3人の会話 */
  static double setScore(QuestionSet s) {
    String text = s.passage() != null ? s.passage() : s.script() != null ? s.script() : "";
    double score = words(text);
    List<SetQuestion> questions = s.questions() == null ? List.of() : s.questions();
    if (!questions.isEmpty()) {
      long hard = questions.stream()
          .filter(q -> HARD_QUESTION_TYPES.contains(QuestionTags.setQuestionType(s.type(), q.question(), q.choices())))
          .count();
      score += 150.0 * hard / questions.size();
    }
    if (text.contains("【Document 3")) {
      score += 300;
    } else if (text.contains("【Document")) {
      score += 200;
    }
    if (text.contains("Man 2:") || text.contains("Woman 2:")) {
      score += 50;
    }
    return score;
  }

  /**
   * 直近の正答率から、次に中心に出す難易度を決める。
   *
   * @param recentResults 直近の設問ごとの正誤(新しい順)
   * @return 解答が少なければ null(難易度で絞らない)
   */
  public static Integer target(List<Boolean> recentResults) {
    List<Boolean> recent = recentResults.stream().limit(RECENT_ANSWERS).toList();
    if (recent.size() < MIN_ANSWERS) {
      return null;
    }
    double rate = recent.stream().filter(Boolean.TRUE::equals).count() / (double) recent.size();
    if (rate >= HARD_FROM) {
      return HARD;
    }
    return rate < BASIC_BELOW ? EASY : NORMAL;
  }

  private static int words(String text) {
    if (text == null || text.isBlank()) {
      return 0;
    }
    return text.trim().split("\\s+").length;
  }
}
