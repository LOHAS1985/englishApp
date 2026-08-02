package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GrammarService {

  private final GrammarApiClient grammarApiClient;
  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;

  private final Map<String, PendingQuestion> pendingQuestions = new ConcurrentHashMap<>();

  public GrammarService(GrammarApiClient grammarApiClient,
      GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider) {
    this.grammarApiClient = grammarApiClient;
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

        Return the result as a JSON object with fields: sentence, choices (array of 4 objects with "label" and "text"),
        correctChoice (one of "A","B","C","D"), explanation (Japanese), translation (Japanese).
        """;

    GeneratedQuestion generated = grammarApiClient.generate(prompt, GeneratedQuestion.class);

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