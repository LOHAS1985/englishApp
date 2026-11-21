package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 本番プロファイルで、必須の設定が欠けていたら起動を失敗させる。
 * <ul>
 * <li>DB の接続先(SPRING_DATASOURCE_URL)が無いと、メモリ内の H2 で動き、再起動のたびに学習記録が消える</li>
 * <li>端末登録の合言葉(APP_ACCESS_KEY)が無いと、API がだれでも使える(記録の混入・Gemini の無料枠の消費)</li>
 * </ul>
 * どちらも画面は普通に動くので、気づかないまま使い続けてしまう。起動に失敗すれば、Render は新しい版に切り替えず、
 * 動いていた版を使い続ける。本番プロファイルのテストや Docker のビルド時の起動は、設定が無いので
 * APP_STRICT_CONFIG=false で検査を切る。
 * 遅延初期化(spring.main.lazy-initialization)でも起動時に検査するよう、@Lazy(false) にしている。
 */
@Lazy(false)
@Component
@Profile("prod")
public class ProductionConfigGuard {

  public ProductionConfigGuard(
      @Value("${app.strict-config:true}") boolean strict,
      @Value("${spring.datasource.url:}") String datasourceUrl,
      @Value("${app.access-key:}") String accessKey) {
    if (!strict) {
      return;
    }
    List<String> problems = problems(datasourceUrl, accessKey);
    if (!problems.isEmpty()) {
      throw new IllegalStateException(
          "本番の必須設定が足りないため、起動を中止します。\n- " + String.join("\n- ", problems));
    }
  }

  /** 足りない設定の説明(足りていれば空)。値そのものは出さない */
  static List<String> problems(String datasourceUrl, String accessKey) {
    List<String> problems = new ArrayList<>();
    if (datasourceUrl == null || datasourceUrl.isBlank() || datasourceUrl.startsWith("jdbc:h2:")) {
      problems.add("SPRING_DATASOURCE_URL(jdbc:postgresql://...)が未設定です。このままではメモリ内の DB で動き、再起動で記録が消えます");
    }
    if (accessKey == null || accessKey.isBlank()) {
      problems.add("APP_ACCESS_KEY(端末登録の合言葉)が未設定です。このままでは API がだれでも使えます");
    }
    return problems;
  }
}
