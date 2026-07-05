package com.example.backend.dto;

import java.util.List;

public class ScoreRequest {
  private String topic;
  private List<String> points;
  private String answer;

  public String getTopic() {
    return topic;
  }

  public void setTopic(String topic) {
    this.topic = topic;
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