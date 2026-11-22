package com.example.backend.grammar;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.PracticeRecordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 文法の解答の入力の検査。空や選択肢にない記号は記録せず 400 にする */
@SpringBootTest
@AutoConfigureMockMvc
class GrammarAnswerTests {

  @Autowired
  private MockMvc mvc;
  @Autowired
  private GrammarQuestionBank bank;
  @Autowired
  private GrammarRecordRepository grammarRecords;

  @Test
  void aMissingOrUnknownChoiceIsRejectedAndNothingIsRecorded() throws Exception {
    String id = bank.ids().get(0);
    long before = grammarRecords.count();

    for (String body : new String[] {
        "{\"questionId\":\"" + id + "\"}",
        "{\"questionId\":\"" + id + "\",\"selectedChoice\":\"\"}",
        "{\"questionId\":\"" + id + "\",\"selectedChoice\":\"Z\"}" }) {
      mvc.perform(post("/api/grammar/answer").contentType(MediaType.APPLICATION_JSON).content(body))
          .andExpect(status().isBadRequest());
    }
    assertThat(grammarRecords.count()).isEqualTo(before);
  }

  @Test
  void aChoiceIsStoredAsTheUpperCaseLetter() throws Exception {
    String id = bank.ids().get(0);
    ChoiceQuestion q = bank.findById(id).orElseThrow();
    String lower = " " + q.answer().toLowerCase() + " ";

    mvc.perform(post("/api/grammar/answer").contentType(MediaType.APPLICATION_JSON)
        .content("{\"questionId\":\"" + id + "\",\"selectedChoice\":\"" + lower + "\"}"))
        .andExpect(status().isOk());

    GrammarRecord saved = grammarRecords.findByUserIdOrderByIdDesc(
        grammarRecords.findAll().get(0).getUserId()).get(0);
    assertThat(saved.getSelectedChoice()).isEqualTo(q.answer());
    assertThat(saved.isCorrect()).isTrue();
  }
}
