package com.example.backend.dto;

public class ScoreResult {
  private CriterionScore content;
  private CriterionScore structure;
  private CriterionScore vocabulary;
  private CriterionScore grammar;
  private int total;

  public CriterionScore getContent() {
    return content;
  }

  public void setContent(CriterionScore content) {
    this.content = content;
  }

  public CriterionScore getStructure() {
    return structure;
  }

  public void setStructure(CriterionScore structure) {
    this.structure = structure;
  }

  public CriterionScore getVocabulary() {
    return vocabulary;
  }

  public void setVocabulary(CriterionScore vocabulary) {
    this.vocabulary = vocabulary;
  }

  public CriterionScore getGrammar() {
    return grammar;
  }

  public void setGrammar(CriterionScore grammar) {
    this.grammar = grammar;
  }

  public int getTotal() {
    return total;
  }

  public void setTotal(int total) {
    this.total = total;
  }

  public static class CriterionScore {
    private int score;
    private String feedback;

    public int getScore() {
      return score;
    }

    public void setScore(int score) {
      this.score = score;
    }

    public String getFeedback() {
      return feedback;
    }

    public void setFeedback(String feedback) {
      this.feedback = feedback;
    }
  }
}