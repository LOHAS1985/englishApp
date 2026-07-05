package com.example.backend.service;

import com.example.backend.dto.WritingQuestion;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

  @Value("${gemini.api.key}")
  private String apiKey;

  private final WebClient webClient = WebClient.create(
      "https://generativelanguage.googleapis.com");

  public WritingQuestion generateWritingQuestion() {
    String prompt = """
        英検準1級のライティング問題を1つ作成してください。
        以下のJSON形式のみで出力してください（説明文は不要）。
        {"topic": "トピック文", "instructions": "120-150語で意見を述べる指示文"}
        """;

    Map response = webClient.post()
        .uri("/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .bodyValue(Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(Map.of("text", prompt))))))
        .retrieve()
        .bodyToMono(Map.class)
        .block();

    String text = extractText(response);
    return parseJson(text);
  }

  private String extractText(Map response) {
    List candidates = (List) response.get("candidates");
    Map candidate = (Map) candidates.get(0);
    Map content = (Map) candidate.get("content");
    List parts = (List) content.get("parts");
    Map part = (Map) parts.get(0);
    return (String) part.get("text");
  }

  private WritingQuestion parseJson(String text) {
    try {
      ObjectMapper mapper = new ObjectMapper();
      String cleaned = text.replaceAll("```json|```", "").trim();
      return mapper.readValue(cleaned, WritingQuestion.class);
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse Gemini response", e);
    }
  }
}
