package com.example.backend.writing.dto;

import java.util.List;

public class WritingQuestion {

  private String prompt;

  private String topic;

  private List<String> points;

  public String getPrompt() {
    return prompt;
  }

  public void setPrompt(String prompt) {
    this.prompt = prompt;
  }

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
}