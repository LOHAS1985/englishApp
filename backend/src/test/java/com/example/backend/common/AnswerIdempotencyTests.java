package com.example.backend.common;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.StudyLog;
import com.example.backend.stats.StudyLogRepository;
import com.example.backend.vocab.VocabQuestionBank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 画面の送信待ちの列が解答を再送しても、記録が二重にならないこと。
 * 解いた時刻を画面から受け取ること、問題 ID が見つからないときは 404(画面が後で再送する)を返すこと。
 */
@SpringBootTest
@AutoConfigureMockMvc
class AnswerIdempotencyTests {

  private static final ZoneId JST = ZoneId.of("Asia/Tokyo");

  @Autowired
  private MockMvc mvc;
  @Autowired
  private StudyLogRepository studyLogs;
  @Autowired
  private CurrentUserProvider currentUserProvider;
  @Autowired
  private GrammarQuestionBank grammarBank;
  @Autowired
  private VocabQuestionBank vocabBank;
  @Autowired
  private ReadingQuestionBank readingBank;
  @Autowired
  private ListeningQuestionBank listeningBank;

  private static String newId() {
    return "test-" + UUID.randomUUID();
  }

  private List<StudyLog> logsOf(String clientRequestId) {
    return studyLogs.findAll().stream().filter(l -> clientRequestId.equals(l.getClientRequestId())).toList();
  }

  private void postJson(String path, String body) throws Exception {
    mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
  }

  private String grammarBody(String id, String answeredAt) {
    String questionId = grammarBank.ids().get(0);
    String at = answeredAt == null ? "" : ",\"answeredAt\":\"" + answeredAt + "\"";
    return "{\"questionId\":\"" + questionId + "\",\"selectedChoice\":\"A\",\"durationSeconds\":20,"
        + "\"clientRequestId\":\"" + id + "\"" + at + "}";
  }

  @Test
  void grammarAnswerResentWithTheSameIdIsRecordedOnce() throws Exception {
    String id = newId();
    postJson("/api/grammar/answer", grammarBody(id, null));
    postJson("/api/grammar/answer", grammarBody(id, null));
    assertThat(logsOf(id)).hasSize(1);

    // 別の解答は別に記録する
    String other = newId();
    postJson("/api/grammar/answer", grammarBody(other, null));
    assertThat(logsOf(other)).hasSize(1);
  }

  @Test
  void answersWithoutAnIdAreAlwaysRecorded() throws Exception {
    long before = studyLogs.count();
    String body = "{\"questionId\":\"" + grammarBank.ids().get(0) + "\",\"selectedChoice\":\"A\"}";
    postJson("/api/grammar/answer", body);
    postJson("/api/grammar/answer", body);
    assertThat(studyLogs.count()).isEqualTo(before + 2);
  }

  @Test
  void vocabAnswerResentWithTheSameIdIsRecordedOnce() throws Exception {
    String id = newId();
    String body = "{\"questionId\":\"" + vocabBank.ids().get(0) + "\",\"selectedChoice\":\"B\","
        + "\"clientRequestId\":\"" + id + "\"}";
    postJson("/api/vocab/answer", body);
    postJson("/api/vocab/answer", body);
    assertThat(logsOf(id)).hasSize(1);
  }

  @Test
  void readingAnswerResentWithTheSameIdIsRecordedOnce() throws Exception {
    String id = newId();
    String setId = readingBank.all().stream().filter(s -> s.passage() != null).findFirst().orElseThrow().id();
    String body = "{\"setId\":\"" + setId + "\",\"answers\":[\"A\"],\"durationSeconds\":90,"
        + "\"clientRequestId\":\"" + id + "\"}";
    postJson("/api/reading/practice/answer", body);
    postJson("/api/reading/practice/answer", body);

    assertThat(logsOf(id)).hasSize(1);
  }

  @Test
  void listeningAnswerResentWithTheSameIdIsRecordedOnce() throws Exception {
    String id = newId();
    String body = "{\"setId\":\"" + listeningBank.all().get(0).id() + "\",\"answers\":[\"A\"],"
        + "\"clientRequestId\":\"" + id + "\"}";
    postJson("/api/listening/practice/answer", body);
    postJson("/api/listening/practice/answer", body);
    assertThat(logsOf(id)).hasSize(1);
  }

  @Test
  void answeredAtFromTheClientIsUsedForTheStudyLog() throws Exception {
    String id = newId();
    Instant twoDaysAgo = Instant.now().minus(2, ChronoUnit.DAYS);
    postJson("/api/grammar/answer", grammarBody(id, twoDaysAgo.toString()));

    LocalDateTime saved = logsOf(id).get(0).getCreatedAt();
    LocalDateTime now = LocalDateTime.now(JST);
    assertThat(saved).isBefore(now.minusDays(2).plusMinutes(5));
    assertThat(saved).isAfter(now.minusDays(2).minusMinutes(5));
  }

  @Test
  void implausibleAnsweredAtIsReplacedByNow() throws Exception {
    String id = newId();
    postJson("/api/grammar/answer", grammarBody(id, "2001-01-01T00:00:00Z"));

    LocalDateTime saved = logsOf(id).get(0).getCreatedAt();
    assertThat(saved).isAfter(LocalDateTime.now(JST).minusMinutes(5));
  }

  @Test
  void unknownQuestionIdsAreNotFoundSoTheClientKeepsTheRecord() throws Exception {
    mvc.perform(post("/api/grammar/answer").contentType(MediaType.APPLICATION_JSON)
        .content("{\"questionId\":\"g9999\",\"selectedChoice\":\"A\"}")).andExpect(status().isNotFound());
    mvc.perform(post("/api/reading/practice/answer").contentType(MediaType.APPLICATION_JSON)
        .content("{\"setId\":\"r9999\",\"answers\":[\"A\"]}")).andExpect(status().isNotFound());
    mvc.perform(post("/api/listening/practice/answer").contentType(MediaType.APPLICATION_JSON)
        .content("{\"setId\":\"l9999\",\"answers\":[\"A\"]}")).andExpect(status().isNotFound());
    mvc.perform(post("/api/vocab/answer").contentType(MediaType.APPLICATION_JSON)
        .content("{\"questionId\":\"v9999\",\"selectedChoice\":\"A\"}")).andExpect(status().isNotFound());
  }

  @Test
  void theSameIdCannotBeStoredTwiceEvenWhenTwoRequestsRace() {
    // 同時に届いた2つの再送は、どちらも「未保存」と判断しうる。最後の砦として、データベースが重複を拒否する
    String id = newId();
    Long userId = currentUserProvider.getCurrentUserId();
    LocalDateTime at = LocalDateTime.now();
    studyLogs.saveAndFlush(new StudyLog(userId, "grammar", "toeic-part5", "g0001", 1, 1, 10, at, id));
    assertThatThrownBy(
        () -> studyLogs.saveAndFlush(new StudyLog(userId, "grammar", "toeic-part5", "g0001", 1, 1, 10, at, id)))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
