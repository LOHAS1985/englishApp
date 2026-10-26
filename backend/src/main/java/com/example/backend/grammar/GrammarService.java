package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class GrammarService {

  private final GrammarApiClient grammarApiClient;
  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final PendingGrammarQuestionRepository pendingQuestionRepository;

  public GrammarService(GrammarApiClient grammarApiClient,
      GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider,
      PendingGrammarQuestionRepository pendingQuestionRepository) {
    this.grammarApiClient = grammarApiClient;
    this.grammarRecordRepository = grammarRecordRepository;
    this.currentUserProvider = currentUserProvider;
    this.pendingQuestionRepository = pendingQuestionRepository;
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

    // 回答されずに残った問題は1日で破棄する
    pendingQuestionRepository.deleteOlderThan(LocalDateTime.now().minusDays(1));

    PendingGrammarQuestion pending = new PendingGrammarQuestion();
    pending.setId(UUID.randomUUID().toString());
    pending.setSentence(generated.sentence);
    pending.setChoiceA(textFor(generated.choices, "A"));
    pending.setChoiceB(textFor(generated.choices, "B"));
    pending.setChoiceC(textFor(generated.choices, "C"));
    pending.setChoiceD(textFor(generated.choices, "D"));
    pending.setCorrectChoice(generated.correctChoice);
    pending.setExplanation(generated.explanation);
    pending.setTranslation(generated.translation);
    pendingQuestionRepository.save(pending);

    return new GrammarQuestion(pending.getId(), generated.sentence, generated.choices);
  }

  public GrammarAnswerResult answer(GrammarAnswerRequest request) {
    PendingGrammarQuestion q = pendingQuestionRepository.findById(request.getQuestionId())
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません。再度出題してください。"));

    boolean isCorrect = q.getCorrectChoice().equalsIgnoreCase(request.getSelectedChoice());

    GrammarRecord record = new GrammarRecord();
    record.setUserId(currentUserProvider.getCurrentUser().getId());
    record.setSentence(q.getSentence());
    record.setChoiceA(q.getChoiceA());
    record.setChoiceB(q.getChoiceB());
    record.setChoiceC(q.getChoiceC());
    record.setChoiceD(q.getChoiceD());
    record.setCorrectChoice(q.getCorrectChoice());
    record.setSelectedChoice(request.getSelectedChoice());
    record.setCorrect(isCorrect);
    record.setExplanation(q.getExplanation());
    record.setTranslation(q.getTranslation());
    grammarRecordRepository.save(record);
    pendingQuestionRepository.delete(q);

    return new GrammarAnswerResult(isCorrect, q.getCorrectChoice(), q.getExplanation(), q.getTranslation());
  }

  private String textFor(List<GrammarChoice> choices, String label) {
    return choices.stream()
        .filter(c -> c.label().equals(label))
        .findFirst()
        .map(GrammarChoice::text)
        .orElse("");
  }

  public static class GeneratedQuestion {
    public String sentence;
    public List<GrammarChoice> choices;
    public String correctChoice;
    public String explanation;
    public String translation;
  }
}
