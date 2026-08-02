package com.example.backend.reading;

import com.example.backend.reading.dto.VocabularyItem;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReadingAssistService {

  private final ReadingApiClient readingApiClient;

  public ReadingAssistService(ReadingApiClient readingApiClient) {
    this.readingApiClient = readingApiClient;
  }

  public AssistResult generate(String plainTextBody) {
    String truncated = plainTextBody.length() > 6000
        ? plainTextBody.substring(0, 6000)
        : plainTextBody;

    String prompt = """
        You are helping a Japanese learner of English read a news article.

        Given the article text below, produce:
        1. A concise Japanese summary (about 100-150 characters).
        2. 5-8 important or challenging vocabulary items from the article, each with:
           - the word or phrase as it appears in the article
           - its Japanese meaning
           - the exact sentence from the article where it appears (as the example)

        ARTICLE:
        %s

        Return the result as a JSON object with fields: summary (Japanese string),
        vocabulary (array of objects with "word", "meaning", "example").
        """.formatted(truncated);

    return readingApiClient.generate(prompt, AssistResult.class);
  }

  public static class AssistResult {
    public String summary;
    public List<VocabularyItem> vocabulary;
  }
}