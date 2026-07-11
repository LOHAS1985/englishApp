package com.example.backend.dto;

public class GrammarAnswerRequest {
  private String questionId;
  private String selectedChoice;

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