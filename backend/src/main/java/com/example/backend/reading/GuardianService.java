package com.example.backend.reading;

import com.example.backend.reading.dto.ArticleDetail;
import com.example.backend.reading.dto.ArticleSummary;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
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

    Map<String, Object> response = webClient.get()
        .uri(uri)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
        })
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

    Map<String, Object> response = webClient.get()
        .uri(uri)
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
        })
        .block();

    return parseArticleDetail(response);
  }

  @SuppressWarnings("unchecked")
  private List<ArticleSummary> parseArticleList(Map<String, Object> response) {
    Map<String, Object> responseBody = (Map<String, Object>) response.get("response");
    List<Map<String, Object>> results = (List<Map<String, Object>>) responseBody.get("results");

    return results.stream().map(item -> {
      Map<String, Object> fields = (Map<String, Object>) item.get("fields");
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
  private ArticleDetail parseArticleDetail(Map<String, Object> response) {
    Map<String, Object> responseBody = (Map<String, Object>) response.get("response");
    Map<String, Object> content = (Map<String, Object>) responseBody.get("content");
    Map<String, Object> fields = (Map<String, Object>) content.get("fields");

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