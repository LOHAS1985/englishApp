package com.example.backend.level;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.level.XpRules.DayXp;
import com.example.backend.level.XpRules.LogEntry;
import com.example.backend.level.dto.LevelSummary;
import com.example.backend.level.dto.LevelSummary.DayPoint;
import com.example.backend.level.dto.LevelSummary.Today;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.StudyLogRepository;
import com.example.backend.stats.StudyLogService;
import com.example.backend.vocab.VocabQuestionBank;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** 学習ログから経験値・レベル・期限までのペースを計算する(計算規則は XpRules) */
@Service
public class LevelService {

  static final int RECENT_DAYS = 14;

  private final StudyLogRepository studyLogRepository;
  private final CurrentUserProvider currentUserProvider;
  private final GrammarQuestionBank grammarBank;
  private final VocabQuestionBank vocabBank;
  private final ReadingQuestionBank readingBank;
  private final ListeningQuestionBank listeningBank;

  public LevelService(StudyLogRepository studyLogRepository, CurrentUserProvider currentUserProvider,
      GrammarQuestionBank grammarBank, VocabQuestionBank vocabBank, ReadingQuestionBank readingBank,
      ListeningQuestionBank listeningBank) {
    this.studyLogRepository = studyLogRepository;
    this.currentUserProvider = currentUserProvider;
    this.grammarBank = grammarBank;
    this.vocabBank = vocabBank;
    this.readingBank = readingBank;
    this.listeningBank = listeningBank;
  }

  public LevelSummary summary() {
    List<LogEntry> logs = studyLogRepository.findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId())
        .stream()
        .map(l -> new LogEntry(l.getFeature(), l.getItemType(), l.getItemId(), l.getCorrectCount(),
            l.getTotalCount(), l.getDurationSeconds(), l.getCreatedAt()))
        .toList();
    return summarize(XpRules.calculate(logs, this::difficulty), LocalDate.now(StudyLogService.JST));
  }

  /** 問題集から消えた問題や、難易度の無い形式(ライティングなど)は標準として扱う */
  private Integer difficulty(String type, String itemId) {
    if (itemId == null || type == null) {
      return 2;
    }
    if (type.equals("toeic-part5")) {
      return grammarBank.difficulty(itemId);
    }
    if (type.equals("vocab")) {
      return vocabBank.difficulty(itemId);
    }
    if (itemId.startsWith("r")) {
      return readingBank.difficulty(itemId);
    }
    if (itemId.startsWith("l")) {
      return listeningBank.difficulty(itemId);
    }
    return 2;
  }

  static LevelSummary summarize(Map<LocalDate, DayXp> days, LocalDate today) {
    long total = days.values().stream().mapToLong(DayXp::total).sum();
    int level = XpRules.levelFor(total);
    DayXp todayXp = days.get(today);
    DayXp yesterday = days.get(today.minusDays(1));
    // 今日まだ10分に達していなくても、昨日まで続いていれば連続日数は途切れていない
    int streak = todayXp != null && todayXp.streak() > 0 ? todayXp.streak()
        : yesterday != null ? yesterday.streak() : 0;

    long expected = XpRules.expectedXp(today);
    long diff = total - expected;
    String pace = diff >= 0 ? "ahead" : diff >= -XpRules.DAILY_TARGET_XP ? "onTrack" : "behind";
    long daysLeft = Math.max(0, XpRules.GOAL.toEpochDay() - today.toEpochDay() + 1);
    long remaining = Math.max(0, XpRules.TOTAL_XP - total);
    long perDay = daysLeft == 0 ? remaining : (remaining + daysLeft - 1) / daysLeft;

    List<DayPoint> recent = new ArrayList<>();
    for (int i = RECENT_DAYS - 1; i >= 0; i--) {
      LocalDate d = today.minusDays(i);
      DayXp x = days.get(d);
      recent.add(new DayPoint(d.toString(), x == null ? 0 : x.total()));
    }

    Today t = todayXp == null ? new Today(0, 0, 0, 0, 1, 0, 0)
        : new Today(todayXp.total(), todayXp.answers(), todayXp.time(), todayXp.bonus(), todayXp.multiplier(),
            todayXp.minutes(), todayXp.skills());
    return new LevelSummary(level, XpRules.MAX_LEVEL, total, XpRules.xpForLevel(level),
        level >= XpRules.MAX_LEVEL ? null : XpRules.xpForLevel(level + 1), t, streak, XpRules.DAILY_TARGET_XP,
        expected, XpRules.levelFor(expected), pace, perDay, daysLeft, XpRules.GOAL.toString(), recent);
  }
}
