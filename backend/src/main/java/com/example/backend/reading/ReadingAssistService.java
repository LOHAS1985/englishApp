package com.example.backend.reading;

import com.example.backend.reading.dto.VocabularyItem;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class ReadingAssistService {

  @Value("${gemini.api.key}")
  private String apiKey;

  private final WebClient webClient = WebClient.create(
      "https://generativelanguage.googleapis.com");

  public AssistResult generate(String plainTextBody) {
    String truncated = plainTextBody.length() > 6000
        ? plainTextBody.substring(0, 6000)
        : plainTextBody;

    String prompt = """
        You are helping a Japanese learner of English read a news article.

        Given the article text below, produce:
        1. A concise Japanese summary (about 100-150 characters).
        2. 5-8 important or challenging vocabulary items from the article, each with:
           - the word or phrase as it appears in the article
           - its Japanese meaning
           - the exact sentence from the article where it appears (as the example)

        ARTICLE:
        %s

        Return ONLY valid JSON in this format:
        {
          "summary": "...",
          "vocabulary": [
            {"word": "...", "meaning": "...", "example": "..."}
          ]
        }

        Do not include markdown. Do not wrap the JSON in triple backticks. Do not add explanations outside the JSON.
        """.formatted(truncated);

    Map response = webClient.post()
        .uri("/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(Map.of("text", prompt)))),
            "generationConfig", Map.of(
                "responseMimeType", "application/json")))
        .retrieve()
        .bodyToMono(Map.class)
        .block();

    String text = extractText(response);
    return parseAssistResult(text);
  }

  @SuppressWarnings("unchecked")
  private String extractText(Map response) {
    List candidates = (List) response.get("candidates");
    Map candidate = (Map) candidates.get(0);
    Map content = (Map) candidate.get("content");
    List parts = (List) content.get("parts");
    Map part = (Map) parts.get(0);
    return (String) part.get("text");
  }

  private AssistResult parseAssistResult(String text) {
    try {
      ObjectMapper mapper = new ObjectMapper();
      String cleaned = text.replaceAll("```json|```", "").trim();
      return mapper.readValue(cleaned, AssistResult.class);
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse Gemini reading-assist response", e);
    }
  }

  public static class AssistResult {
    public String summary;
    public List<VocabularyItem> vocabulary;
  }
}