package com.example.backend.mock;

import com.example.backend.common.PracticeRecordRepository;
import com.example.backend.mock.dto.MockSubmit;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.StudyLogService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;

/** 模試の提出は1トランザクション。途中で失敗したら、解答の記録も残らない(再提出で二重にならないように) */
@SpringBootTest
class MockSubmitTransactionTests {

  @Autowired
  private MockExamService service;
  @Autowired
  private ReadingQuestionBank readingBank;
  @Autowired
  private PracticeRecordRepository records;

  @MockitoSpyBean
  private StudyLogService studyLog;

  @Test
  void aFailedSubmitLeavesNoAnswerRecordsBehind() {
    String setId = readingBank.all().stream().filter(s -> s.questions().size() >= 2).findFirst().orElseThrow().id();
    long before = records.count();
    // 解答の記録は保存されるが、学習ログの書き込みで失敗する
    doThrow(new IllegalStateException("db down")).when(studyLog)
        .logSession(anyString(), anyString(), anyString(), anyInt(), anyInt(), anyInt());

    MockSubmit request = new MockSubmit(List.of(new MockSubmit.Section("reading", 600, List.of(
        new MockSubmit.Answer("reading", setId, List.of("A", "B"))))));

    assertThatThrownBy(() -> service.submit(request)).isInstanceOf(IllegalStateException.class);
    assertThat(records.count()).isEqualTo(before);
  }
}
