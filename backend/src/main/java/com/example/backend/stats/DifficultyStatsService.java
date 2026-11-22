package com.example.backend.stats;

import com.example.backend.common.ChoiceQuestionBank;
import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.common.QuestionSetBank;
import com.example.backend.common.SignatureCache;
import com.example.backend.common.TableSignature;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.grammar.GrammarRecordRepository;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.dto.DifficultyItem;
import com.example.backend.vocab.VocabQuestionBank;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 難易度4(難関)の成績。難易度4は、目標の水準(英検準1級・TOEIC 930 の手前の難しさ)の問題。
 * 自動の難易度の調整は、正答率が85%以上なら1つ上に上げる(QuestionPicker)ので、その基準と同じ85%を目標にする。
 */
@Service
public class DifficultyStatsService {

  /** 難易度4の目標の正答率(%)。難易度の自動調整で、1つ上に上げる基準と同じ */
  public static final int TARGET_PERCENT = 85;
  static final int LEVEL = 4;

  /** 難易度4の成績を見る機能(セット問題は設問単位で数える) */
  private static final List<String> PRACTICE_FEATURES = List.of("vocab", "reading", "listening");

  private final GrammarRecordRepository grammarRecordRepository;
  private final PracticeRecordRepository practiceRecordRepository;
  private final GrammarQuestionBank grammarBank;
  private final VocabQuestionBank vocabBank;
  private final ReadingQuestionBank readingBank;
  private final ListeningQuestionBank listeningBank;
  private final CurrentUserProvider currentUserProvider;
  /** 記録が増えるまでは使い回す(弱点分析と同じ方式) */
  private final SignatureCache<List<DifficultyItem>> cache = new SignatureCache<>();

  public DifficultyStatsService(GrammarRecordRepository grammarRecordRepository,
      PracticeRecordRepository practiceRecordRepository, GrammarQuestionBank grammarBank,
      VocabQuestionBank vocabBank, ReadingQuestionBank readingBank, ListeningQuestionBank listeningBank,
      CurrentUserProvider currentUserProvider) {
    this.grammarRecordRepository = grammarRecordRepository;
    this.practiceRecordRepository = practiceRecordRepository;
    this.grammarBank = grammarBank;
    this.vocabBank = vocabBank;
    this.readingBank = readingBank;
    this.listeningBank = listeningBank;
    this.currentUserProvider = currentUserProvider;
  }

  public List<DifficultyItem> summary() {
    Long userId = currentUserProvider.getCurrentUserId();
    TableSignature grammar = grammarRecordRepository.signature(userId);
    TableSignature practice = practiceRecordRepository.signature(userId, PRACTICE_FEATURES);
    return cache.get(List.of(userId, grammar.getCount(), grammar.getMaxId(), practice.getCount(),
        practice.getMaxId()), () -> compute(userId));
  }

  private List<DifficultyItem> compute(Long userId) {
    List<DifficultyItem> items = new ArrayList<>();
    items.add(choice("grammar", grammarBank, grammarRecordRepository.findByUserIdOrderByIdDesc(userId)
        .stream().filter(r -> r.getQuestionId() != null)
        .map(r -> new Answer(r.getQuestionId(), r.isCorrect())).toList()));
    items.add(choice("vocab", vocabBank, practiceAnswers(userId, "vocab")));
    items.add(sets("reading", readingBank, practiceAnswers(userId, "reading")));
    items.add(sets("listening", listeningBank, practiceAnswers(userId, "listening")));
    return items;
  }

  private List<Answer> practiceAnswers(Long userId, String feature) {
    return practiceRecordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, feature).stream()
        .filter(r -> r.getCorrect() != null)
        .map(r -> new Answer(r.getItemId(), Boolean.TRUE.equals(r.getCorrect())))
        .toList();
  }

  private record Answer(String itemId, boolean correct) {
  }

  private static DifficultyItem choice(String feature, ChoiceQuestionBank bank, List<Answer> answers) {
    int available = (int) bank.all().stream().filter(q -> bank.difficulty(q.id()) == LEVEL).count();
    int answered = 0;
    int correct = 0;
    for (Answer a : answers) {
      if (bank.findById(a.itemId()).isPresent() && bank.difficulty(a.itemId()) == LEVEL) {
        answered++;
        if (a.correct()) correct++;
      }
    }
    return new DifficultyItem(feature, available, answered, correct);
  }

  private static DifficultyItem sets(String feature, QuestionSetBank bank, List<Answer> answers) {
    int available = (int) bank.all().stream().filter(s -> bank.difficulty(s.id()) == LEVEL)
        .mapToInt(s -> s.questions().size()).sum();
    int answered = 0;
    int correct = 0;
    for (Answer a : answers) {
      if (bank.findById(a.itemId()).isPresent() && bank.difficulty(a.itemId()) == LEVEL) {
        answered++;
        if (a.correct()) correct++;
      }
    }
    return new DifficultyItem(feature, available, answered, correct);
  }
}
