package com.example.backend.grammar.dto;

import java.time.Instant;

public class GrammarAnswerRequest {
  private String questionId;
  private String selectedChoice;
  /** 出題から解答までの秒数(学習時間の記録用) */
  private Integer durationSeconds;

  /** 画面の送信待ちの列が付ける解答ごとの ID。再送で二重に保存しないために使う(無ければ null) */
  private String clientRequestId;
  /** 解いた時刻。送信が遅れても、解いた日に数えるために使う(無ければ受信時刻) */
  private Instant answeredAt;

  public String getClientRequestId() {
    return clientRequestId;
  }

  public void setClientRequestId(String clientRequestId) {
    this.clientRequestId = clientRequestId;
  }

  public Instant getAnsweredAt() {
    return answeredAt;
  }

  public void setAnsweredAt(Instant answeredAt) {
    this.answeredAt = answeredAt;
  }

  public Integer getDurationSeconds() {
    return durationSeconds;
  }

  public void setDurationSeconds(Integer durationSeconds) {
    this.durationSeconds = durationSeconds;
  }

  public String getQuestionId() {
    return questionId;
  }

  public void setQuestionId(String questionId) {
    this.questionId = questionId;
  }

  public String getSelectedChoice() {
    return selectedChoice;
  }

  public void setSelectedChoice(String selectedChoice) {
    this.selectedChoice = selectedChoice;
  }
}