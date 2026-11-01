package com.example.backend.device;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 登録済みの端末(DeviceService)からのリクエストだけ /api/** を通す。
 * 対象外:端末の登録そのもの、/api/access-logs(独自の閲覧キー ACCESS_LOG_KEY で保護)、
 * /health と生成音声(/audio/**。死活監視と &lt;audio&gt; 要素はヘッダーを付けられない)。
 * Spring Security のフィルタ(CORS)より後に動くので、401 にも CORS ヘッダーが付き、画面側で端末の登録を促せる。
 */
@Component
public class DeviceFilter extends OncePerRequestFilter {

  static final String HEADER = "X-Device-Token";
  /** 認証した端末の ID。DeviceController が「この端末」の判定に使う */
  public static final String DEVICE_ID_ATTRIBUTE = "deviceId";

  private final DeviceService deviceService;

  public DeviceFilter(DeviceService deviceService) {
    this.deviceService = deviceService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !deviceService.enabled()
        || "OPTIONS".equals(request.getMethod())
        || !path.startsWith("/api/")
        || path.startsWith("/api/access-logs")
        || path.equals("/api/devices/register");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Long deviceId = deviceService.authenticate(request.getHeader(HEADER));
    if (deviceId != null) {
      request.setAttribute(DEVICE_ID_ATTRIBUTE, deviceId);
      chain.doFilter(request, response);
      return;
    }
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write("{\"error\":\"この端末は登録されていません\"}");
  }
}
