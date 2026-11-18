package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Duration;
import java.util.List;

@Configuration(proxyBeanMethods = false)
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(csrf -> csrf.disable())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        // 利用者は1人だけなのでログインは設けない。記録は CurrentUserProvider の owner ユーザーに保存する
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .httpBasic(basic -> basic.disable())
        .formLogin(form -> form.disable());

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    // 本番フロント(GitHub Pages)とローカル開発のみ許可。ポート違い・127.0.0.1 も許容する
    configuration.setAllowedOriginPatterns(List.of(
        "http://localhost:[*]",
        "http://127.0.0.1:[*]",
        "https://lohas1985.github.io"));
    configuration.setAllowedMethods(List.of("GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);
    // 別のドメイン(GitHub Pages → Render)から X-Device-Token 付きで呼ぶと、ブラウザは本番の呼び出しの前に
    // 確認用の通信(プリフライト)を送る。キャッシュ指定が無いと約5秒しか覚えず、ほぼ毎回 0.2〜0.4 秒の往復が増える。
    // Chrome は2時間までしか覚えないので、1時間にしておく
    configuration.setMaxAge(Duration.ofHours(1));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
