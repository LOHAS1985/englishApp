package com.example.backend.service;

import com.example.backend.dto.ArticleDetail;
import com.example.backend.dto.ArticleSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
public class GuardianService {

  @Value("${guardian.api.key}")
  private String apiKey;

  private final WebClient webClient = WebClient.create("https://content.guardianapis.com");

  public List<ArticleSummary> searchArticles(String query, int page) {
    String uri = UriComponentsBuilder.fromPath("/search")
        .queryParam("api-key", apiKey)
        .queryParam("page", page)
        .queryParam("page-size", 20)
        .queryParam("show-fields", "thumbnail")
        .queryParamIfPresent("q", query != null && !query.isBlank()
            ? java.util.Optional.of(query)
            : java.util.Optional.empty())
        .build()
        .toUriString();

    Map response = webClient.get()
        .uri(uri)
        .retrieve()
        .bodyToMono(Map.class)
        .block();

    return parseArticleList(response);
  }

  public ArticleDetail getArticle(String articleId) {
    String decodedId = articleId;
    String encodedPath = URLEncoder.encode(decodedId, StandardCharsets.UTF_8).replace("%2F", "/");

    String uri = UriComponentsBuilder.fromPath("/" + encodedPath)
        .queryParam("api-key", apiKey)
        .queryParam("show-fields", "body,byline,thumbnail")
        .build(false)
        .toUriString();

    Map response = webClient.get()
        .uri(uri)
        .retrieve()
        .bodyToMono(Map.class)
        .block();

    return parseArticleDetail(response);
  }

  @SuppressWarnings("unchecked")
  private List<ArticleSummary> parseArticleList(Map response) {
    Map responseBody = (Map) response.get("response");
    List<Map> results = (List<Map>) responseBody.get("results");

    return results.stream().map(item -> {
      Map fields = (Map) item.get("fields");
      String thumbnail = fields != null ? (String) fields.get("thumbnail") : null;
      return new ArticleSummary(
          (String) item.get("id"),
          (String) item.get("webTitle"),
          (String) item.get("sectionName"),
          thumbnail,
          (String) item.get("webPublicationDate"));
    }).toList();
  }

  @SuppressWarnings("unchecked")
  private ArticleDetail parseArticleDetail(Map response) {
    Map responseBody = (Map) response.get("response");
    Map content = (Map) responseBody.get("content");
    Map fields = (Map) content.get("fields");

    return new ArticleDetail(
        (String) content.get("id"),
        (String) content.get("webTitle"),
        fields != null ? (String) fields.get("byline") : null,
        fields != null ? (String) fields.get("body") : "",
        (String) content.get("webUrl"),
        (String) content.get("webPublicationDate"),
        null,
        null);
  }
}