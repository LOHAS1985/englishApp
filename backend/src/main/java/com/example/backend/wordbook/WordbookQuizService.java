package com.example.backend.wordbook;

import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import com.example.backend.wordbook.dto.AnswerResultView;
import com.example.backend.wordbook.dto.ChoiceAnswerRequest;
import com.example.backend.wordbook.dto.ChoiceQuestionView;
import com.example.backend.wordbook.dto.FillAnswerRequest;
import com.example.backend.wordbook.dto.FillQuestionView;
import com.example.backend.wordbook.dto.HistoryItem;
import com.example.backend.wordbook.dto.StatsView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 単語帳の出題と採点。4択(英単語→日本語)と穴埋め(英文の空所に英単語を入れる)の2形式。
 * 答えは利用者の単語に紐づくのでサーバーで採点し、その場で記録を残す(ライティングと同じ扱い)。
 */
@Service
public class WordbookQuizService {

  /** 4択の誤答の数(正解と合わせて4つ) */
  static final int WRONG_CHOICES = 3;
  private static final int HISTORY_LIMIT = 30;
  private static final String FEATURE = "wordbook";
  /** 復習の段階がこれ以上の語を「定着」とみなす(段階 2 は、3日後の復習のあと7日以上空けて正解した語) */
  private static final int MASTERED_STAGE = 2;
  private static final int RECENT_DAYS = 7;
  /** 苦手な語に入れるのは、この回数以上出した語だけ(1回の誤答で決めつけない) */
  private static final int WEAK_MIN_ASKED = 2;
  private static final int WEAK_LIMIT = 10;

  private final WordbookService wordService;
  private final PracticeRecordRepository recordRepository;
  private final StudyLogService studyLogService;
  private final CurrentUserProvider currentUserProvider;
  private final Random random = new Random();

  public WordbookQuizService(WordbookService wordService, PracticeRecordRepository recordRepository,
      StudyLogService studyLogService, CurrentUserProvider currentUserProvider) {
    this.wordService = wordService;
    this.recordRepository = recordRepository;
    this.studyLogService = studyLogService;
    this.currentUserProvider = currentUserProvider;
  }

  public ChoiceQuestionView choiceQuestion(Set<Long> exclude) {
    List<WordbookWord> ready = wordService.ownedWords().stream().filter(WordbookWord::canAskChoice).toList();
    WordbookWord target = WordbookPicker.pick(ready, exclude, today(), random);
    List<String> choices = new ArrayList<>(WordbookPicker.distractors(target, ready, WRONG_CHOICES, random));
    choices.add(target.getMeaningJa());
    Collections.shuffle(choices, random);
    return new ChoiceQuestionView(target.getId(), target.getWord(), choices);
  }

  @Transactional
  public AnswerResultView answerChoice(ChoiceAnswerRequest request) {
    WordbookWord word = wordService.owned(request.wordId());
    if (!word.canAskChoice()) {
      throw new IllegalArgumentException("この単語は訳がまだ揃っていないので、4択では答えられません");
    }
    String selected = request.selectedMeaning() == null ? "" : request.selectedMeaning().trim();
    boolean correct = selected.equals(word.getMeaningJa());
    record("wordbook-choice", word, correct, request.durationSeconds());
    return result(word, correct, word.getMeaningJa());
  }

  public FillQuestionView fillQuestion(Set<Long> exclude) {
    List<WordbookWord> ready = wordService.ownedWords().stream().filter(WordbookWord::canAskFill).toList();
    WordbookWord target = WordbookPicker.pick(ready, exclude, today(), random);
    return new FillQuestionView(target.getId(),
        WordbookSentences.blank(target.getExampleEn(), target.getExampleAnswer()), target.getExampleJa(),
        WordbookSentences.hint(target.getExampleAnswer()));
  }

  @Transactional
  public AnswerResultView answerFill(FillAnswerRequest request) {
    WordbookWord word = wordService.owned(request.wordId());
    if (!word.canAskFill()) {
      throw new IllegalArgumentException("この単語は穴埋めの例文がないか、例文の訳がまだ揃っていません");
    }
    boolean correct = WordForms.matchesAnswer(request.typed(), word.getWord(), word.getExampleAnswer());
    record("wordbook-fill", word, correct, request.durationSeconds());
    return result(word, correct, word.getExampleAnswer());
  }

  /** 習熟度の分布・直近7日の正答率・苦手な語(MyPage の単語帳の欄に出す) */
  public StatsView stats() {
    List<WordbookWord> ready = wordService.ownedWords().stream().filter(WordbookWord::isTranslated).toList();
    long unseen = ready.stream().filter(WordbookWord::isUnseen).count();
    long mastered = ready.stream().filter(w -> w.getReviewStage() != null && w.getReviewStage() >= MASTERED_STAGE).count();

    LocalDateTime since = LocalDateTime.now(StudyLogService.JST).minusDays(RECENT_DAYS);
    Long userId = currentUserProvider.getCurrentUserId();
    List<PracticeRecord> recent = recordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, FEATURE).stream()
        .filter(r -> !r.getCreatedAt().isBefore(since)).toList();

    List<StatsView.WeakWord> weakest = ready.stream()
        .filter(w -> w.getTimesAsked() >= WEAK_MIN_ASKED && w.getTimesCorrect() < w.getTimesAsked())
        .sorted(Comparator.comparingDouble((WordbookWord w) -> (double) w.getTimesCorrect() / w.getTimesAsked())
            .thenComparing(Comparator.comparingInt(WordbookWord::getTimesAsked).reversed()))
        .limit(WEAK_LIMIT)
        .map(w -> new StatsView.WeakWord(w.getId(), w.getWord(), w.getMeaningJa(), w.getTimesAsked(),
            w.getTimesCorrect()))
        .toList();

    return new StatsView(ready.size(), unseen, ready.size() - unseen - mastered, mastered, recent.size(),
        (int) recent.stream().filter(r -> Boolean.TRUE.equals(r.getCorrect())).count(), weakest);
  }

  /** 直近の解答(新しい順)。単語の綴りは今の単語帳から引く(削除された語は除く) */
  public List<HistoryItem> history() {
    Map<Long, String> words = wordService.ownedWords().stream()
        .collect(Collectors.toMap(WordbookWord::getId, WordbookWord::getWord));
    Long userId = currentUserProvider.getCurrentUserId();
    return recordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, FEATURE).stream()
        .limit(HISTORY_LIMIT)
        .filter(r -> words.containsKey(Long.valueOf(r.getItemId())))
        .map(r -> new HistoryItem(Long.valueOf(r.getItemId()), words.get(Long.valueOf(r.getItemId())),
            Boolean.TRUE.equals(r.getCorrect()), r.getCreatedAt()))
        .toList();
  }

  private static LocalDate today() {
    return LocalDate.now(StudyLogService.JST);
  }

  /**
   * 解答記録(練習記録と学習ログ)と、語の復習の状態の更新。
   * 学習ログの形式は4択・穴埋めで分け、経験値の規則に使う
   */
  private void record(String itemType, WordbookWord word, boolean correct, Integer durationSeconds) {
    word.recordAnswer(correct, LocalDateTime.now(StudyLogService.JST));
    wordService.save(word);
    String itemId = String.valueOf(word.getId());
    recordRepository.save(new PracticeRecord(currentUserProvider.getCurrentUserId(), FEATURE, itemId, 1, null,
        correct));
    studyLogService.log("vocab", itemType, itemId, correct ? 1 : 0, 1, durationSeconds);
  }

  private AnswerResultView result(WordbookWord word, boolean correct, String correctAnswer) {
    return new AnswerResultView(correct, word.getWord(), word.getMeaningJa(), correctAnswer,
        word.getExampleEn(), word.getExampleJa(), word.getColor().name(), wordService.sensesOf(word));
  }
}
