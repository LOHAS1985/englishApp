package com.example.backend.writing.dto;

import java.util.List;

public class ScoreRequest {
  private String topic;
  private String prompt;
  private List<String> points;
  private String answer;

  public String getTopic() {
    return topic;
  }

  public void setTopic(String topic) {
    this.topic = topic;
  }

  public String getPrompt() {
    return prompt;
  }

  public void setPrompt(String prompt) {
    this.prompt = prompt;
  }

  public List<String> getPoints() {
    return points;
  }

  public void setPoints(List<String> points) {
    this.points = points;
  }

  public String getAnswer() {
    return answer;
  }

  public void setAnswer(String answer) {
    this.answer = answer;
  }
}