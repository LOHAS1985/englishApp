package com.example.backend.service;

import com.example.backend.dto.ScoreRequest;
import com.example.backend.dto.ScoreResult;
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

  private static final String MODEL = "gemini-2.5-flash";

  private final WebClient webClient = WebClient.create(
      "https://generativelanguage.googleapis.com");

  public WritingQuestion generateWritingQuestion() {
    String prompt = """
                You are an expert creator of Eiken Pre-1 writing questions.

        Generate ONE original writing question that closely follows the official Eiken Pre-1 format.

        Example:

        Write an essay on the given TOPIC.
        Use TWO of the POINTS below to support your answer.
        Structure: introduction, main body, and conclusion.
        Suggested length: 120–150 words.

        TOPIC
        Agree or disagree: Governments should do more to address the problem of social isolation.

        POINTS
        - Community
        - Costs
        - Elderly people
        - Mental health

        Now create ONE NEW question.

        Requirements:

        - Do NOT copy the example.
        - The topic should be about a contemporary social issue.
        - The topic should have reasonable arguments for both agree and disagree.
        - The four points should be closely related to the topic.
        - Each point should be one or two words.
        - The difficulty should match the official Eiken Pre-1 writing section.

        Additional requirements:

        - The TOPIC should focus on a social issue, public policy, education, technology, the environment, the economy, or health.
        - The POINTS should represent different perspectives and should not overlap.
        - Ensure the question resembles the style and difficulty of official Eiken Pre-1 questions, while remaining completely original.

        Return ONLY valid JSON in the following format:

        {
          "prompt": "Write an essay on the given TOPIC. Use TWO of the POINTS below to support your answer.",
          "topic": "Agree or disagree: ...",
          "points": [
            "...",
            "...",
            "...",
            "..."
          ]
        }

        Do not include markdown.
        Do not wrap the JSON in triple backticks.
        Do not add explanations.
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
    System.out.println("Gemini response:");
    System.out.println(text);

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

  public ScoreResult scoreAnswer(ScoreRequest request) {
    String prompt = """
        You are a strict but fair examiner for the Eiken Pre-1 writing test.

        Evaluate the following essay on 4 criteria, each scored 0-4 points (integer only).

        Criteria:
        1. content - Does it include a clear opinion and well-developed reasons that answer the task?
        2. structure - Is the essay logically organized with a clear flow (introduction, body, conclusion) and good use of linking words?
        3. vocabulary - Is the vocabulary appropriate for the task, varied, and used correctly without excessive repetition?
        4. grammar - Is there a good variety of sentence structures used correctly?

        For each criterion, give a score (0-4) and feedback in Japanese.

        The feedback MUST include concrete references to the actual essay text, not general advice. Specifically:
        - Quote the exact word, phrase, or sentence from the essay that has a problem (using quotation marks).
        - Explain concretely what is wrong with it (e.g. repetition, wrong word choice, unclear logic, grammatical error).
        - Suggest a specific alternative word, phrase, or sentence that would improve it.
        - If a criterion has no issues, mention one specific strength by quoting the relevant part of the essay instead of a generic compliment.
        - Keep each feedback to 2-4 sentences, but every sentence must reference specific content from the essay.

        Example of good feedback style (content criterion):
        "第2文の 'It is convenient' は理由が説明されておらず主張が弱いです。'It saves commuters up to 30 minutes each day, which reduces stress and increases productivity' のように、便利さが具体的に何をもたらすかまで書くと説得力が増します。"

        Example of bad feedback style (too generic, DO NOT do this):
        "理由をもっと具体的に書きましょう。"

        TOPIC: %s

        POINTS: %s

        ESSAY:
        %s

        Return ONLY valid JSON in the following format:
        {
          "content": {"score": 0, "feedback": "..."},
          "structure": {"score": 0, "feedback": "..."},
          "vocabulary": {"score": 0, "feedback": "..."},
          "grammar": {"score": 0, "feedback": "..."}
        }

        Do not include markdown. Do not wrap the JSON in triple backticks. Do not add explanations.
        """
        .formatted(request.getTopic(), String.join(", ", request.getPoints()), request.getAnswer());

    Map response = webClient.post()
        .uri("/v1beta/models/" + MODEL + ":generateContent?key=" + apiKey)
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
    return parseScoreResult(text);
  }

  private ScoreResult parseScoreResult(String text) {
    try {
      ObjectMapper mapper = new ObjectMapper();
      String cleaned = text.replaceAll("```json|```", "").trim();
      ScoreResult result = mapper.readValue(cleaned, ScoreResult.class);
      int total = result.getContent().getScore()
          + result.getStructure().getScore()
          + result.getVocabulary().getScore()
          + result.getGrammar().getScore();
      result.setTotal(total);
      return result;
    } catch (Exception e) {
      throw new RuntimeException("Failed to parse Gemini score response", e);
    }
  }
}
