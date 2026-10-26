package com.example.backend.grammar;

import com.example.backend.grammar.dto.GrammarChoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * resources/questions/grammar/*.json に置いた TOEIC Part 5 形式の問題集。
 * 起動時に全件をメモリへ読み込み、出題・採点はここから引く(Gemini は使わない)。
 */
@Component
public class GrammarQuestionBank {

  private static final Logger logger = LoggerFactory.getLogger(GrammarQuestionBank.class);
  static final String LOCATION = "classpath:questions/grammar/*.json";

  /** JSON の1問分 */
  public record BankQuestion(
      String id,
      String point,
      String sentence,
      List<GrammarChoice> choices,
      String answer,
      String explanation,
      String translation) {
  }

  private final Map<String, BankQuestion> byId;
  private final List<BankQuestion> all;

  public GrammarQuestionBank(JsonMapper jsonMapper) throws IOException {
    Resource[] files = new PathMatchingResourcePatternResolver().getResources(LOCATION);
    Arrays.sort(files, Comparator.comparing(Resource::getFilename));

    Map<String, BankQuestion> map = new LinkedHashMap<>();
    for (Resource file : files) {
      try (InputStream in = file.getInputStream()) {
        for (BankQuestion q : jsonMapper.readValue(in, BankQuestion[].class)) {
          if (map.putIfAbsent(q.id(), q) != null) {
            throw new IllegalStateException("問題IDが重複しています: " + q.id() + " (" + file.getFilename() + ")");
          }
        }
      }
    }
    this.byId = map;
    this.all = new ArrayList<>(map.values());
    logger.info("grammar question bank loaded: {} questions from {} files", all.size(), files.length);
  }

  public BankQuestion random() {
    if (all.isEmpty()) {
      throw new IllegalStateException("文法問題が登録されていません");
    }
    return all.get(ThreadLocalRandom.current().nextInt(all.size()));
  }

  public Optional<BankQuestion> findById(String id) {
    return Optional.ofNullable(byId.get(id));
  }

  public List<BankQuestion> all() {
    return List.copyOf(all);
  }
}
