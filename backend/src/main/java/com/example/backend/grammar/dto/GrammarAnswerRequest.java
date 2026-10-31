package com.example.backend.grammar.dto;

public class GrammarAnswerRequest {
  private String questionId;
  private String selectedChoice;
  /** 出題から解答までの秒数(学習時間の記録用) */
  private Integer durationSeconds;

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