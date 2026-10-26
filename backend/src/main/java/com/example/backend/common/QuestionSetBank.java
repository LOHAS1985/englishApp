package com.example.backend.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 文章(またはリスニングのスクリプト)1つに複数の設問が付くセット問題の問題集。
 * リーディング(TOEIC Part 6 / 7、英検の長文)とリスニングで共通に使う。
 */
public class QuestionSetBank {

  private static final Logger logger = LoggerFactory.getLogger(QuestionSetBank.class);

  public record SetQuestion(
      String question,
      List<String> choices,
      String answer,
      String explanation) {
  }

  /**
   * @param passage    リーディングの本文(Part 6 の空所は [1] [2] ... と表記)。リスニングでは null
   * @param script     リスニングの台本("Man: ..." のように話者ラベル付き)。リーディングでは null
   * @param situation  英検リスニング Part 3 の状況説明など、画面に先に表示する文。不要なら null
   */
  public record QuestionSet(
      String id,
      String type,
      String title,
      String passage,
      String script,
      String situation,
      String translation,
      List<SetQuestion> questions) {
  }

  private final Map<String, QuestionSet> byId;
  private final List<QuestionSet> all;

  public QuestionSetBank(JsonMapper jsonMapper, String feature) {
    this.byId = QuestionBankLoader.load(jsonMapper, feature, QuestionSet[].class, QuestionSet::id);
    this.all = new ArrayList<>(byId.values());
    logger.info("{} question set bank loaded: {} sets", feature, all.size());
  }

  /** 出題候補の ID。type を指定するとその形式だけ(null なら全形式) */
  public List<String> ids(String type) {
    List<String> ids = all.stream()
        .filter(s -> type == null || type.isBlank() || s.type().equals(type))
        .map(QuestionSet::id)
        .toList();
    if (ids.isEmpty()) {
      throw new IllegalArgumentException("この形式の問題はまだ登録されていません: " + type);
    }
    return ids;
  }

  public Optional<QuestionSet> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  public List<QuestionSet> all() {
    return List.copyOf(all);
  }

  /** 形式ごとのセット数(画面の選択肢表示用) */
  public Map<String, Long> countByType() {
    Map<String, Long> counts = new java.util.LinkedHashMap<>();
    for (QuestionSet s : all) {
      counts.merge(s.type(), 1L, Long::sum);
    }
    return counts;
  }
}
