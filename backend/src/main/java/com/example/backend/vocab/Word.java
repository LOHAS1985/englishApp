package com.example.backend.vocab;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "words")
public class Word {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String word;
  @Column(columnDefinition = "TEXT")
  private String meaningEn;
  @Column(columnDefinition = "TEXT")
  private String exampleEn;
  @Column(columnDefinition = "TEXT")
  private String meaningJa;
  @Column(columnDefinition = "TEXT")
  private String exampleJa;

  private LocalDateTime createdAt = LocalDateTime.now();

  public Word() {
  }

  public Word(String word) {
    this.word = word;
  }

  // getters and setters
  public Long getId() {
    return id;
  }

  public void setId(Long id) {
    this.id = id;
  }

  public String getWord() {
    return word;
  }

  public void setWord(String word) {
    this.word = word;
  }

  public String getMeaningEn() {
    return meaningEn;
  }

  public void setMeaningEn(String meaningEn) {
    this.meaningEn = meaningEn;
  }

  public String getExampleEn() {
    return exampleEn;
  }

  public void setExampleEn(String exampleEn) {
    this.exampleEn = exampleEn;
  }

  public String getMeaningJa() {
    return meaningJa;
  }

  public void setMeaningJa(String meaningJa) {
    this.meaningJa = meaningJa;
  }

  public String getExampleJa() {
    return exampleJa;
  }

  public void setExampleJa(String exampleJa) {
    this.exampleJa = exampleJa;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
