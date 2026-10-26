package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * TOEIC Part 5 形式の文法問題を出題・採点する。
 * Gemini の生成待ち(数秒〜十数秒)を出題時に発生させないため、問題をまとめて生成して DB にストックし、
 * 出題はストックから返す。ストックが減ったら裏で補充する。
 */
@Service
public class GrammarService {

  private static final Logger logger = LoggerFactory.getLogger(GrammarService.class);
  /** 1回の Gemini 呼び出しで生成する問題数(無料枠のリクエスト回数も節約できる) */
  private static final int BATCH_SIZE = 5;
  /** ストックがこの数を下回ったら補充する */
  private static final int MIN_STOCK = 3;
  private static final Set<String> LABELS = Set.of("A", "B", "C", "D");

  private final GrammarApiClient grammarApiClient;
  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final PendingGrammarQuestionRepository pendingQuestionRepository;

  private final ExecutorService refillExecutor = Executors.newSingleThreadExecutor();
  private final AtomicBoolean refilling = new AtomicBoolean(false);

  public GrammarService(GrammarApiClient grammarApiClient,
      GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider,
      PendingGrammarQuestionRepository pendingQuestionRepository) {
    this.grammarApiClient = grammarApiClient;
    this.grammarRecordRepository = grammarRecordRepository;
    this.currentUserProvider = currentUserProvider;
    this.pendingQuestionRepository = pendingQuestionRepository;
  }

  /** 起動直後にストックを用意しておき、最初の出題から待たせない */
  @EventListener(ApplicationReadyEvent.class)
  public void warmUpStock() {
    refillAsyncIfNeeded();
  }

  @PreDestroy
  public void shutdownExecutor() {
    refillExecutor.shutdownNow();
  }

  public GrammarQuestion generateQuestion() {
    // 回答されずに残った問題は1日で破棄する
    pendingQuestionRepository.deleteServedOlderThan(LocalDateTime.now().minusDays(1));

    PendingGrammarQuestion question = pendingQuestionRepository.findFirstByServedFalseOrderByCreatedAtAsc()
        // ストック切れのときだけ、その場で1問生成する
        .orElseGet(() -> generateAndStore(1).get(0));
    question.setServed(true);
    pendingQuestionRepository.save(question);

    refillAsyncIfNeeded();

    return new GrammarQuestion(question.getId(), question.getSentence(), List.of(
        new GrammarChoice("A", question.getChoiceA()),
        new GrammarChoice("B", question.getChoiceB()),
        new GrammarChoice("C", question.getChoiceC()),
        new GrammarChoice("D", question.getChoiceD())));
  }

  public GrammarAnswerResult answer(GrammarAnswerRequest request) {
    PendingGrammarQuestion q = pendingQuestionRepository.findById(request.getQuestionId())
        .filter(PendingGrammarQuestion::isServed)
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

  /** 裏で補充中かどうか(テストで補充の完了を待つために使う) */
  boolean isRefilling() {
    return refilling.get();
  }

  private void refillAsyncIfNeeded() {
    if (pendingQuestionRepository.countByServedFalse() >= MIN_STOCK)
      return;
    // 補充は同時に1つだけ走らせる
    if (!refilling.compareAndSet(false, true))
      return;
    refillExecutor.submit(() -> {
      try {
        int created = generateAndStore(BATCH_SIZE).size();
        logger.info("grammar stock refilled: +{} (stock={})", created, pendingQuestionRepository.countByServedFalse());
      } catch (Exception e) {
        logger.warn("grammar stock refill failed: {}", e.getMessage());
      } finally {
        refilling.set(false);
      }
    });
  }

  /** Gemini で count 問生成し、形式が正しいものだけをストックとして保存して返す */
  private List<PendingGrammarQuestion> generateAndStore(int count) {
    GeneratedQuestion[] generated = grammarApiClient.generate(buildPrompt(count), GeneratedQuestion[].class);

    List<PendingGrammarQuestion> saved = new ArrayList<>();
    for (GeneratedQuestion g : generated == null ? new GeneratedQuestion[0] : generated) {
      if (!isValid(g)) {
        logger.info("grammar: skipped invalid generated question");
        continue;
      }
      PendingGrammarQuestion pending = new PendingGrammarQuestion();
      pending.setId(UUID.randomUUID().toString());
      pending.setSentence(g.sentence);
      pending.setChoiceA(textFor(g.choices, "A"));
      pending.setChoiceB(textFor(g.choices, "B"));
      pending.setChoiceC(textFor(g.choices, "C"));
      pending.setChoiceD(textFor(g.choices, "D"));
      pending.setCorrectChoice(normalizeLabel(g.correctChoice));
      pending.setExplanation(g.explanation);
      pending.setTranslation(g.translation);
      saved.add(pendingQuestionRepository.save(pending));
    }
    if (saved.isEmpty()) {
      throw new IllegalStateException("問題の生成に失敗しました。もう一度お試しください。");
    }
    return saved;
  }

  private String buildPrompt(int count) {
    return """
        You are an expert creator of TOEIC Part 5 (grammar/vocabulary) questions.

        Generate %d original TOEIC Part 5 style questions, similar in difficulty and format to:

        Example:
        Rachel was sorry ------- her brother's opening night performance, but there was no helping it.
        (A) being missed (B) missed (C) missing (D) to have missed
        Answer: (D)

        Requirements:
        - Each sentence must contain exactly one blank represented by "-------".
        - Provide exactly 4 answer choices labeled A, B, C, D.
        - Only one choice is grammatically/lexically correct.
        - Each question must test a DIFFERENT point (verb forms, prepositions, word forms, conjunctions,
          pronouns, vocabulary, etc.), and the correct answer letters should be varied.
        - The difficulty should target a TOEIC score of 900+.
        - explanation must be written in Japanese, explaining why the correct choice is right and briefly why the others are wrong.
        - translation must be the Japanese translation of the complete, correct sentence.

        Return the result as a JSON array of %d objects, each with fields: sentence,
        choices (array of 4 objects with "label" and "text"), correctChoice (one of "A","B","C","D"),
        explanation (Japanese), translation (Japanese).
        """.formatted(count, count);
  }

  private boolean isValid(GeneratedQuestion g) {
    return g != null && g.sentence != null && !g.sentence.isBlank()
        && g.choices != null && g.choices.size() == 4
        && g.choices.stream().allMatch(c -> c != null && LABELS.contains(normalizeLabel(c.label())) && c.text() != null)
        && LABELS.contains(normalizeLabel(g.correctChoice))
        && g.explanation != null && g.translation != null;
  }

  private String textFor(List<GrammarChoice> choices, String label) {
    return choices.stream()
        .filter(c -> normalizeLabel(c.label()).equals(label))
        .findFirst()
        .map(GrammarChoice::text)
        .orElse("");
  }

  /** "(A)" や "A." のような表記ゆれを "A" にそろえる */
  private static String normalizeLabel(String label) {
    return label == null ? "" : label.replaceAll("[^A-Za-z]", "").toUpperCase();
  }

  public static class GeneratedQuestion {
    public String sentence;
    public List<GrammarChoice> choices;
    public String correctChoice;
    public String explanation;
    public String translation;
  }
}
