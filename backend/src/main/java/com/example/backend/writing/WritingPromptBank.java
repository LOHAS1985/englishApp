package com.example.backend.writing;

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
 * 英検準1級ライティングのお題集(resources/questions/writing/*.json)。
 * type: opinion(意見論述 120〜150語、topic + points) / summary(要約 60〜70語、topic + passage)
 */
@Component
public class WritingPromptBank {

  private static final Logger logger = LoggerFactory.getLogger(WritingPromptBank.class);

  public record WritingPrompt(String id, String type, String topic, List<String> points, String passage) {

    public boolean isSummary() {
      return "summary".equals(type);
    }

    public int minWords() {
      return isSummary() ? 60 : 120;
    }

    public int maxWords() {
      return isSummary() ? 70 : 150;
    }

    /** 画面に表示する指示文(英検の問題冊子の指示に準拠) */
    public String instruction() {
      return isSummary()
          ? "Read the article below and summarize it in your own words as far as possible in English. "
              + "Suggested length: 60–70 words."
          : "Write an essay on the given TOPIC. Use TWO of the POINTS below to support your answer. "
              + "Structure: introduction, main body, and conclusion. Suggested length: 120–150 words.";
    }
  }

  private final Map<String, WritingPrompt> byId;
  private final List<WritingPrompt> all;

  public WritingPromptBank(JsonMapper jsonMapper) {
    this.byId = QuestionBankLoader.load(jsonMapper, "writing", WritingPrompt[].class, WritingPrompt::id);
    this.all = new ArrayList<>(byId.values());
    logger.info("writing prompt bank loaded: {} prompts", all.size());
  }

  /** 出題候補の ID。type を指定するとその形式だけ(null なら全形式) */
  public List<String> ids(String type) {
    List<String> ids = all.stream()
        .filter(p -> type == null || type.isBlank() || p.type().equals(type))
        .map(WritingPrompt::id)
        .toList();
    if (ids.isEmpty()) {
      throw new IllegalArgumentException("この形式のお題はまだ登録されていません: " + type);
    }
    return ids;
  }

  public Optional<WritingPrompt> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  public List<WritingPrompt> all() {
    return List.copyOf(all);
  }
}
