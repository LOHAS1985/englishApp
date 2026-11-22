package com.example.backend.grammar;

import com.example.backend.common.QuestionNotFoundException;
import com.example.backend.common.QuestionSelector;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import com.example.backend.review.ReviewService;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/** TOEIC Part 5 形式の文法問題を、リポジトリ内の問題集(GrammarQuestionBank)から出題・採点する */
@Service
public class GrammarService {

  private final GrammarQuestionBank questionBank;
  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final QuestionSelector questionSelector;
  private final StudyLogService studyLogService;
  private final ReviewService reviewService;

  public GrammarService(GrammarQuestionBank questionBank,
      GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider,
      QuestionSelector questionSelector,
      StudyLogService studyLogService,
      ReviewService reviewService) {
    this.questionBank = questionBank;
    this.grammarRecordRepository = grammarRecordRepository;
    this.currentUserProvider = currentUserProvider;
    this.questionSelector = questionSelector;
    this.studyLogService = studyLogService;
    this.reviewService = reviewService;
  }

  /**
   * @param exclude 画面に表示中の問題の ID(先読みで同じ問題を選ばないため)
   * @param review  true なら復習日になった間違えた問題から出す
   * @param level   難易度(1〜3)。null なら直近の正答率に合わせて自動で選ぶ(復習では使わない)
   */
  public GrammarQuestion generateQuestion(String exclude, boolean review, Integer level) {
    String id = review
        ? reviewService.pickDue("grammar", exclude)
        : questionSelector.pick("grammar", questionBank.ids(), exclude, questionBank::difficulty, level);
    ChoiceQuestion q = questionBank.findById(id).orElseThrow();
    return new GrammarQuestion(q.id(), q.sentence(), q.choices(), questionBank.difficulty(q.id()));
  }

  /**
   * 解答記録・復習・学習ログを1つのトランザクションにする(一部だけ保存されて再送で重複するのを防ぐ)。
   * すでに保存した解答(同じ clientRequestId の再送)は、記録を追加せず採点結果だけ返す。
   */
  @Transactional
  public GrammarAnswerResult answer(GrammarAnswerRequest request) {
    ChoiceQuestion q = questionBank.findById(request.getQuestionId())
        .orElseThrow(() -> new QuestionNotFoundException("問題が見つかりません。再度出題してください。"));

    String selected = normalizeChoice(q, request.getSelectedChoice());
    boolean isCorrect;
    if (studyLogService.isRecorded(request.getClientRequestId())) {
      isCorrect = q.answer().equalsIgnoreCase(selected);
    } else {
      LocalDateTime answeredAt = StudyLogService.answeredAt(request.getAnsweredAt());
      isCorrect = saveRecord(q, selected, answeredAt);
      studyLogService.log("grammar", "toeic-part5", q.id(), isCorrect ? 1 : 0, 1, request.getDurationSeconds(),
          request.getClientRequestId(), answeredAt);
    }

    return new GrammarAnswerResult(isCorrect, q.answer(), q.explanation(), q.translation());
  }

  /**
   * 解答記録と復習(間隔反復)の登録だけを行う。学習ログは呼び出し側で書く(模試は区切りごとにまとめて書くため)。
   *
   * @return 正解なら true
   */
  public boolean saveRecord(ChoiceQuestion q, String selectedChoice) {
    return saveRecord(q, selectedChoice, LocalDateTime.now(StudyLogService.JST));
  }

  /** @param answeredAt 解いた日本時間の時刻(復習日の基準にする) */
  public boolean saveRecord(ChoiceQuestion q, String selectedChoice, LocalDateTime answeredAt) {
    boolean isCorrect = q.answer().equalsIgnoreCase(selectedChoice);

    GrammarRecord record = new GrammarRecord();
    record.setUserId(currentUserProvider.getCurrentUserId());
    record.setQuestionId(q.id());
    record.setSentence(q.sentence());
    record.setChoiceA(textFor(q.choices(), "A"));
    record.setChoiceB(textFor(q.choices(), "B"));
    record.setChoiceC(textFor(q.choices(), "C"));
    record.setChoiceD(textFor(q.choices(), "D"));
    record.setCorrectChoice(q.answer());
    record.setSelectedChoice(selectedChoice);
    record.setCorrect(isCorrect);
    record.setExplanation(q.explanation());
    record.setTranslation(q.translation());
    grammarRecordRepository.save(record);
    reviewService.record("grammar", q.id(), isCorrect, answeredAt);
    return isCorrect;
  }

  /**
   * 選んだ記号を、問題の選択肢のどれかに揃える(前後の空白・大文字小文字を直す)。
   * 空や選択肢にない記号は、記録せずに 400 で返す(空の記号を保存すると、記録の列の制約に当たって 500 になり、
   * 画面の送信待ちの列がそこで止まってしまうため)。
   */
  static String normalizeChoice(ChoiceQuestion q, String selected) {
    String label = selected == null ? "" : selected.trim().toUpperCase(Locale.ROOT);
    boolean known = q.choices().stream().anyMatch(c -> c.label().equals(label));
    if (!known) {
      throw new IllegalArgumentException("選択肢(A〜D)から選んでください");
    }
    return label;
  }

  private String textFor(List<GrammarChoice> choices, String label) {
    return choices.stream()
        .filter(c -> c.label().equals(label))
        .findFirst()
        .map(GrammarChoice::text)
        .orElse("");
  }
}
