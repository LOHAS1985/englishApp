package com.example.backend.writing;

import com.example.backend.common.ExternalApiException;
import com.example.backend.common.GeminiApiClient;
import com.example.backend.common.QuestionSelector;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.stats.StudyLogService;
import com.example.backend.writing.dto.ScoreRequest;
import com.example.backend.writing.dto.ScoreResult;
import com.example.backend.writing.dto.ScoreResult.CriterionScore;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** 採点の計算・保存・入力の検査を Gemini の代わりの応答で確かめる(実際の AI には問い合わせない) */
class WritingServiceTests {

  private final GeminiApiClient gemini = mock(GeminiApiClient.class);
  private final WritingRecordRepository records = mock(WritingRecordRepository.class);
  private final StudyLogService studyLog = mock(StudyLogService.class);
  private final WritingPromptBank bank = new WritingPromptBank(JsonMapper.builder().build());
  private final WritingService service = new WritingService(gemini, records,
      mock(CurrentUserProvider.class), bank, mock(QuestionSelector.class), studyLog);

  @Test
  void totalIsTheSumOfTheFourCriteriaAndIsSaved() {
    String id = bank.ids("opinion").get(0);
    when(gemini.generate(anyString(), eq(ScoreResult.class))).thenReturn(result(3, 2, 4, 1));

    ScoreResult scored = service.scoreAnswer(new ScoreRequest(id, "My opinion is clear.", 120));

    assertThat(scored.getTotal()).isEqualTo(10);
    ArgumentCaptor<WritingRecord> saved = ArgumentCaptor.forClass(WritingRecord.class);
    verify(records).save(saved.capture());
    assertThat(saved.getValue().getTotalScore()).isEqualTo(10);
    assertThat(saved.getValue().getGrammarScore()).isEqualTo(1);
    assertThat(saved.getValue().getWordCount()).isEqualTo(4);
    // 学習ログには16点満点と所要秒数を残す(MyPage の集計とレベルの計算に使う)
    verify(studyLog).log("writing", "eiken-opinion", id, 10, 16, 120);
  }

  @Test
  void summaryTasksAreLoggedAsSummary() {
    String id = bank.ids("summary").get(0);
    when(gemini.generate(anyString(), eq(ScoreResult.class))).thenReturn(result(4, 4, 4, 4));

    service.scoreAnswer(new ScoreRequest(id, "The article says something.", null));

    verify(studyLog).log("writing", "eiken-summary", id, 16, 16, null);
  }

  @Test
  void unknownQuestionIsRejectedBeforeAskingTheAi() {
    assertThatThrownBy(() -> service.scoreAnswer(new ScoreRequest("no-such-id", "text", 10)))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(gemini, records, studyLog);
  }

  @Test
  void blankAnswerIsRejectedBeforeAskingTheAi() {
    String id = bank.ids("opinion").get(0);
    assertThatThrownBy(() -> service.scoreAnswer(new ScoreRequest(id, "   ", 10)))
        .isInstanceOf(IllegalArgumentException.class);
    verifyNoInteractions(gemini, records, studyLog);
  }

  @Test
  void incompleteAiResultIsAnErrorAndNothingIsSaved() {
    String id = bank.ids("opinion").get(0);
    ScoreResult incomplete = result(3, 2, 4, 1);
    incomplete.setGrammar(null);
    when(gemini.generate(anyString(), eq(ScoreResult.class))).thenReturn(incomplete);

    assertThatThrownBy(() -> service.scoreAnswer(new ScoreRequest(id, "text", 10)))
        .isInstanceOf(ExternalApiException.class);
    verify(records, never()).save(any());
    verifyNoInteractions(studyLog);
  }

  private static ScoreResult result(int content, int structure, int vocabulary, int grammar) {
    ScoreResult r = new ScoreResult();
    r.setContent(criterion(content));
    r.setStructure(criterion(structure));
    r.setVocabulary(criterion(vocabulary));
    r.setGrammar(criterion(grammar));
    return r;
  }

  private static CriterionScore criterion(int score) {
    CriterionScore c = new CriterionScore();
    c.setScore(score);
    c.setFeedback("ok");
    return c;
  }
}
