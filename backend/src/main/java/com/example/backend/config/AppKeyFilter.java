package com.example.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * 簡易アクセス保護。ログインは設けないが、公開 URL を知っているだけで記録の混入や Gemini 枠の消費・
 * 管理画面の操作ができないよう、環境変数 APP_ACCESS_KEY(合言葉)と同じ値を X-App-Key ヘッダーで
 * 送ったリクエストだけ /api/** を通す。
 * <ul>
 * <li>APP_ACCESS_KEY が未設定なら保護しない(ローカル開発用。本番では起動時に警告を出す)</li>
 * <li>/api/access-logs は独自の閲覧キー(ACCESS_LOG_KEY)で守られているので対象外</li>
 * <li>/health と生成音声(/audio/**)は対象外(死活監視と &lt;audio&gt; 要素はヘッダーを付けられない)</li>
 * </ul>
 * Spring Security のフィルタ(CORS)より後に動くので、401 にも CORS ヘッダーが付き、画面側で合言葉の入力を促せる。
 */
@Component
public class AppKeyFilter extends OncePerRequestFilter {

  private static final Logger logger = LoggerFactory.getLogger(AppKeyFilter.class);

  static final String HEADER = "X-App-Key";

  private final byte[] key;

  public AppKeyFilter(@Value("${app.access-key:}") String key) {
    this.key = key.getBytes(StandardCharsets.UTF_8);
    if (key.isBlank()) {
      logger.warn("APP_ACCESS_KEY が未設定のため、API はだれでも呼び出せます(本番では設定してください)");
    }
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return key.length == 0
        || "OPTIONS".equals(request.getMethod())
        || !path.startsWith("/api/")
        || path.startsWith("/api/access-logs");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (authorized(request.getHeader(HEADER))) {
      chain.doFilter(request, response);
      return;
    }
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write("{\"error\":\"合言葉が違います\"}");
  }

  boolean authorized(String sent) {
    return sent != null && MessageDigest.isEqual(key, sent.getBytes(StandardCharsets.UTF_8));
  }
}
