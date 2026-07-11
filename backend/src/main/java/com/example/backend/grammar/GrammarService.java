package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GrammarService {

  @Value("${gemini.api.key}")
  private String apiKey;

  private final WebClient webClient = WebClient.create(
      "https://generativelanguage.googleapis.com");

  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;

  private final Map<String, PendingQuestion> pendingQuestions = new ConcurrentHashMap<>();

  public GrammarService(GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider) {
    this.grammarRecordRepository = grammarRecordRepository;
    this.currentUserProvider = currentUserProvider;
  }

  public GrammarQuestion generateQuestion() {
    String prompt = """
        You are an expert creator of TOEIC Part 5 (grammar/vocabulary) questions.

        Generate ONE original TOEIC Part 5 style question, similar in difficulty and format to:

        Example:
        Rachel was sorry ------- her brother's opening night performance, but there was no helping it.
        (A) being missed (B) missed (C) missing (D) to have missed
        Answer: (D)

        Requirements:
        - The sentence must contain exactly one blank represented by "-------".
        - Provide exactly 4 answer choices labeled A, B, C, D.
        - Only one choice is grammatically/lexically correct.
        - Cover a mix of grammar points (verb forms, prepositions, word forms, etc.) across requests - vary the point tested.
        - explanation must be written in Japanese, explaining why the correct choice is right and briefly why the others are wrong.
        - translation must be the Japanese translation of the complete, correct sentence.

        Return ONLY valid JSON in this format:
        {
          "sentence": "... ------- ...",
          "choices": [
            {"label": "A", "text": "..."},
            {"label": "B", "text": "..."},
            {"label": "C", "text": "..."},
            {"label": "D", "text": "..."}
          ],
          "correctChoice": "A",
          "explanation": "...",
          "translation": "..."
        }

        Do not include markdown. Do not wrap the JSON in triple backticks. Do not add explanations outside the JSON.
        """;

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
    GeneratedQuestion generated = parseGeneratedQuestion(text);

    String id = UUID.randomUUID().toString();
    pendingQuestions.put(id, new PendingQuestion(generated));

    return new GrammarQuestion(id, generated.sentence, generated.choices);
  }

  public GrammarAnswerResult answer(GrammarAnswerRequest request) {
    PendingQuestion pending = pendingQuestions.remove(request.getQuestionId());
    if (pending == null) {
      throw new IllegalArgumentException("問題が見つかりません。再度出題してください。");
    }

    GeneratedQuestion q = pending.question;
    boolean isCorrect = q.correctChoice.equalsIgnoreCase(request.getSelectedChoice());

    GrammarRecord record = new GrammarRecord();
    record.setUserId(currentUserProvider.getCurrentUser().getId());
    record.setSentence(q.sentence);
    record.setChoiceA(textFor(q.choices, "A"));
    record.setChoiceB(textFor(q.choices, "B"));
    record.setChoiceC(textFor(q.choices, "C"));
    record.setChoiceD(textFor(q.choices, "D"));
    record.setCorrectChoice(q.correctChoice);
    record.setSelectedChoice(request.getSelectedChoice());
    record.setCorrect(isCorrect);
    record.setExplanation(q.explanation);
    record.setTranslation(q.translation);
    grammarRecordRepository.save(record);

    return new GrammarAnswerResult(isCorrect, q.correctChoice, q.explanation, q.translation);
  }

  private String textFor(List<GrammarChoice> choices, String label) {
    return choices.stream()
        .filter(c -> c.label().equals(label))
        .findFirst()
        .map(GrammarChoice::text)
        .orElse("");
  }

  private String extractText(Map response) {
    List candidates = (List) response.get("candidates");
    Map candidate = (Map) candidates.get(0);
    Map content = (Map) candidate.get("content");
    List parts = (List) content.get("parts");
    Map part = (Map) parts.get(0);
    return (String) part.get("text");
  }

  private GeneratedQuestion parseGeneratedQuestion(String text) {
    try {
      ObjectMapper mapper = new ObjectMapper();
      String cleaned = text.replaceAll("```json|```", "").trim();
      return mapper.readValue(cleaned, GeneratedQuestion.class);
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse Gemini grammar response", e);
    }
  }

  private static class PendingQuestion {
    final GeneratedQuestion question;

    PendingQuestion(GeneratedQuestion question) {
      this.question = question;
    }
  }

  public static class GeneratedQuestion {
    public String sentence;
    public List<GrammarChoice> choices;
    public String correctChoice;
    public String explanation;
    public String translation;
  }
}