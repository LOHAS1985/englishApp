package com.example.backend.listening;

public class ListeningExercise {
  private Long id;
  private String title;
  private String audioUrl;
  private String dialogText;
  private String question;
  private String[] choices;

  public ListeningExercise() {
  }

  public ListeningExercise(Long id, String title, String audioUrl, String dialogText, String question,
      String[] choices) {
    this.id = id;
    this.title = title;
    this.audioUrl = audioUrl;
    this.dialogText = dialogText;
    this.question = question;
    this.choices = choices;
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

  public String getDialogText() {
    return dialogText;
  }

  public void setDialogText(String dialogText) {
    this.dialogText = dialogText;
  }

  public String getQuestion() {
    return question;
  }

  public void setQuestion(String question) {
    this.question = question;
  }

  public String[] getChoices() {
    return choices;
  }

  public void setChoices(String[] choices) {
    this.choices = choices;
  }
}
