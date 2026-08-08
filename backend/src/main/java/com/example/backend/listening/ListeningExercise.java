package com.example.backend.listening;

public class ListeningExercise {
  private Long id;
  private String title;
  private String audioUrl;

  public ListeningExercise() {}

  public ListeningExercise(Long id, String title, String audioUrl) {
    this.id = id;
    this.title = title;
    this.audioUrl = audioUrl;
  }

  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getAudioUrl() {
    return audioUrl;
  }

  public void setAudioUrl(String audioUrl) {
    this.audioUrl = audioUrl;
  }
}
