package com.example.backend.common;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * resources/questions/<機能>/*.json の問題集を読み込む共通処理。
 * 各ファイルは問題(またはセット)の JSON 配列で、ファイル名順に読み込む。ID が重複したら起動時に失敗させる。
 */
public final class QuestionBankLoader {

  private QuestionBankLoader() {
  }

  public static <T> Map<String, T> load(JsonMapper jsonMapper, String feature, Class<T[]> type,
      Function<T, String> idOf) {
    String location = "classpath:questions/" + feature + "/*.json";
    try {
      Resource[] files = new PathMatchingResourcePatternResolver().getResources(location);
      Arrays.sort(files, Comparator.comparing(Resource::getFilename));

      Map<String, T> byId = new LinkedHashMap<>();
      for (Resource file : files) {
        try (InputStream in = file.getInputStream()) {
          for (T item : jsonMapper.readValue(in, type)) {
            if (byId.putIfAbsent(idOf.apply(item), item) != null) {
              throw new IllegalStateException(
                  "問題IDが重複しています: " + idOf.apply(item) + " (" + file.getFilename() + ")");
            }
          }
        }
      }
      return byId;
    } catch (IOException e) {
      throw new UncheckedIOException("問題集の読み込みに失敗しました: " + location, e);
    }
  }
}
