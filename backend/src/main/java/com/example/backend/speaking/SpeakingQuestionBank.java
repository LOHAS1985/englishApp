package com.example.backend.speaking;

import com.example.backend.common.QuestionBankLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 英検準1級 二次試験(面接)形式の問題集(resources/questions/speaking/*.json)。
 * 4コマのイラストは用意できないため、各コマの場面を文章(scenes)で示す。
 */
@Component
public class SpeakingQuestionBank {

  private static final Logger logger = LoggerFactory.getLogger(SpeakingQuestionBank.class);

  public record InterviewQuestion(int no, String question, String sampleAnswer) {
  }

  /**
   * @param instruction    問題カードの指示文
   * @param firstSentence  ナレーションの書き出し(カードに指定される1文)
   * @param scenes         4コマそれぞれの場面説明(時間表現・吹き出しを含む)
   * @param narrationSample 模範ナレーション
   * @param questions      No.2〜No.4 の質問と模範解答
   */
  public record SpeakingSet(
      String id,
      String title,
      String instruction,
      String firstSentence,
      List<String> scenes,
      String narrationSample,
      List<InterviewQuestion> questions) {
  }

  private final Map<String, SpeakingSet> byId;
  private final List<SpeakingSet> all;

  public SpeakingQuestionBank(JsonMapper jsonMapper) {
    this.byId = QuestionBankLoader.load(jsonMapper, "speaking", SpeakingSet[].class, SpeakingSet::id);
    this.all = new ArrayList<>(byId.values());
    logger.info("speaking question bank loaded: {} sets", all.size());
  }

  /** 出題候補の ID(どれを出すかは QuestionSelector が出題記録から決める) */
  public List<String> ids() {
    if (all.isEmpty()) {
      throw new IllegalArgumentException("スピーキングの問題がまだ登録されていません");
    }
    return all.stream().map(SpeakingSet::id).toList();
  }

  public Optional<SpeakingSet> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  public List<SpeakingSet> all() {
    return List.copyOf(all);
  }
}
