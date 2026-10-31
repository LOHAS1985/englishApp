package com.example.backend.stats;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.common.QuestionSetBank;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetBank.SetQuestion;
import com.example.backend.common.QuestionTags;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.grammar.GrammarRecordRepository;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.dto.WeaknessItem;
import com.example.backend.vocab.VocabQuestionBank;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 弱点分析:これまでの全解答を、文法の分野・語彙の品詞・読解/リスニングの設問タイプ別に集計する。
 * 分類は解答記録に保存せず、問題集の内容から {@link QuestionTags} でその都度決める
 * (分類の規則を直せば過去の記録にもそのまま反映されるため)。
 */
@Service
public class WeaknessService {

  /** 集計に使う1設問分の解答 */
  record TaggedAnswer(String feature, String type, String category, boolean correct) {
  }

  private final GrammarRecordRepository grammarRecordRepository;
  private final PracticeRecordRepository practiceRecordRepository;
  private final GrammarQuestionBank grammarBank;
  private final VocabQuestionBank vocabBank;
  private final ReadingQuestionBank readingBank;
  private final ListeningQuestionBank listeningBank;
  private final CurrentUserProvider currentUserProvider;

  public WeaknessService(GrammarRecordRepository grammarRecordRepository,
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

  public List<WeaknessItem> summary() {
    Long userId = currentUserProvider.getCurrentUserId();
    List<TaggedAnswer> answers = new ArrayList<>();
    grammarRecordRepository.findByUserIdOrderByIdDesc(userId).forEach(r -> grammarBank.findById(r.getQuestionId())
        .ifPresent(q -> answers.add(new TaggedAnswer("grammar", "toeic-part5",
            QuestionTags.grammarCategory(q.point()), r.isCorrect()))));
    for (PracticeRecord r : practiceRecordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, "vocab")) {
      vocabBank.findById(r.getItemId()).map(ChoiceQuestion::point).ifPresent(point -> answers.add(
          new TaggedAnswer("vocab", "vocab", QuestionTags.vocabCategory(point), Boolean.TRUE.equals(r.getCorrect()))));
    }
    addSetAnswers(answers, "reading", readingBank, userId);
    addSetAnswers(answers, "listening", listeningBank, userId);
    return aggregate(answers);
  }

  private void addSetAnswers(List<TaggedAnswer> answers, String feature, QuestionSetBank bank, Long userId) {
    for (PracticeRecord r : practiceRecordRepository.findByUserIdAndFeatureOrderByIdDesc(userId, feature)) {
      QuestionSet set = bank.findById(r.getItemId()).orElse(null);
      int index = r.getQuestionNo() - 1;
      // 問題集から消えたセット・設問の記録は分類できないので数えない
      if (set == null || index < 0 || index >= set.questions().size()) {
        continue;
      }
      SetQuestion q = set.questions().get(index);
      answers.add(new TaggedAnswer(feature, set.type(),
          QuestionTags.setQuestionType(set.type(), q.question(), q.choices()), Boolean.TRUE.equals(r.getCorrect())));
    }
  }

  /** 形式×分類ごとに集計し、形式ごとに正答率の低い順に並べる */
  static List<WeaknessItem> aggregate(List<TaggedAnswer> answers) {
    Map<String, int[]> counts = new LinkedHashMap<>();
    Map<String, TaggedAnswer> keys = new LinkedHashMap<>();
    for (TaggedAnswer a : answers) {
      String key = a.type() + "\u0000" + a.category();
      keys.putIfAbsent(key, a);
      int[] c = counts.computeIfAbsent(key, k -> new int[2]);
      if (a.correct()) {
        c[0]++;
      }
      c[1]++;
    }
    return keys.entrySet().stream()
        .map(e -> {
          int[] c = counts.get(e.getKey());
          TaggedAnswer a = e.getValue();
          return new WeaknessItem(a.feature(), a.type(), a.category(), c[0], c[1]);
        })
        .sorted(Comparator.comparing(WeaknessItem::type)
            .thenComparingDouble(i -> (double) i.correct() / i.total())
            .thenComparing(Comparator.comparingInt(WeaknessItem::total).reversed()))
        .toList();
  }
}
