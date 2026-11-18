package com.example.backend.stats;

import com.example.backend.common.PracticeRecord;
import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.level.LevelService;
import com.example.backend.level.dto.LevelSummary;
import com.example.backend.stats.dto.WeaknessItem;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/** レベル・弱点分析は、記録が増えるまでは全件を読み直さず、増えたら計算し直す */
@SpringBootTest
class SummaryCacheTests {

  @Autowired
  private LevelService levelService;
  @Autowired
  private WeaknessService weaknessService;
  @Autowired
  private StudyLogService studyLogService;
  @Autowired
  private PracticeRecordRepository practiceRecordRepository;
  @Autowired
  private CurrentUserProvider currentUserProvider;

  @MockitoSpyBean
  private StudyLogRepository studyLogRepository;
  @MockitoSpyBean
  private com.example.backend.grammar.GrammarRecordRepository grammarRecordRepository;

  @Test
  void levelIsNotRecalculatedUntilANewStudyLogArrives() {
    levelService.summary();
    clearInvocations(studyLogRepository);

    LevelSummary again = levelService.summary();
    verify(studyLogRepository, times(0)).findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId());

    studyLogService.log("grammar", "toeic-part5", "g0001", 1, 1, 60);
    LevelSummary updated = levelService.summary();
    verify(studyLogRepository, times(1)).findByUserIdOrderByIdAsc(currentUserProvider.getCurrentUserId());

    // 解答と学習時間の分だけ経験値が増える(古い結果を返していない)
    assertThat(updated.totalXp()).isGreaterThan(again.totalXp());
  }

  @Test
  void weaknessIsNotRecalculatedUntilANewAnswerArrives() {
    Long userId = currentUserProvider.getCurrentUserId();
    List<WeaknessItem> before = weaknessService.summary();
    clearInvocations(grammarRecordRepository);

    // 変化が無ければ、全件を読み直さない
    assertThat(weaknessService.summary()).isEqualTo(before);
    verify(grammarRecordRepository, times(0)).findByUserIdOrderByIdDesc(userId);

    // 語彙の解答が増えたら計算し直し、結果に反映する
    practiceRecordRepository.save(new PracticeRecord(userId, "vocab", "v0001", 1, "A", false));
    List<WeaknessItem> after = weaknessService.summary();
    verify(grammarRecordRepository, times(1)).findByUserIdOrderByIdDesc(userId);
    assertThat(after.stream().mapToInt(WeaknessItem::total).sum())
        .isEqualTo(before.stream().mapToInt(WeaknessItem::total).sum() + 1);
  }
}
