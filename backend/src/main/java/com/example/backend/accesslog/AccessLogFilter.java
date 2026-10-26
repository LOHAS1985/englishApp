package com.example.backend.accesslog;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * API へのアクセスを記録する。対象は /api/** のみ(/health の死活監視や静的ファイル、
 * アクセス履歴の閲覧自体は記録しない)。
 */
@Component
public class AccessLogFilter extends OncePerRequestFilter {

  private final AccessLogService accessLogService;

  public AccessLogFilter(AccessLogService accessLogService) {
    this.accessLogService = accessLogService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return "OPTIONS".equals(request.getMethod())
        || !path.startsWith("/api/")
        || path.startsWith("/api/access-logs");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    accessLogService.record(clientIp(request), request.getMethod(), request.getRequestURI(),
        request.getHeader("User-Agent"));
    chain.doFilter(request, response);
  }

  /** Render などのプロキシ経由では、接続元は X-Forwarded-For の先頭に入る */
  static String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwarded != null && !forwarded.isBlank()) {
      return forwarded.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }
}
