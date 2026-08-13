package com.example.backend.listening;

import com.example.backend.writing.GeminiApiClient;
import com.example.backend.listening.dto.GeneratedDialog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class ListeningGeminiService {

  private static final Logger logger = LoggerFactory.getLogger(ListeningGeminiService.class);

  private final GeminiApiClient geminiApiClient;
  // indicates whether the last generateDialogs call returned fallback dialogs due
  // to quota/errors
  private final AtomicBoolean lastCallUsedFallback = new AtomicBoolean(false);

  public ListeningGeminiService(GeminiApiClient geminiApiClient) {
    this.geminiApiClient = geminiApiClient;
  }

  public List<GeneratedDialog> generateDialogs(int count) {
    if (count <= 0)
      count = 4;
    String prompt = "You are an expert creator of long multi-turn dialogue listening exercises (TOEIC Part 3/4 style)."
        + "\nGenerate " + count
        + " unique dialogs. Each dialog must be a natural conversation between two speakers only (Man and Woman) and be long enough to support multiple comprehension questions."
        + "\nStructure each dialog as 4-10 short speaker lines, each line starting with a speaker label exactly 'Man:' or 'Woman:' (use ONLY these two labels). Do not include any other speaker labels or metadata."
        + "\nFor each dialog, provide EXACTLY THREE distinct listening-comprehension questions about that dialog. Each question should be a separate object and should test different aspects (detail, main idea, inference)."
        + "\nFor each question, provide exactly three answer choices (A, B, C). One choice must be correct."
        + "\nReturn the result strictly as a JSON array of objects with the fields:"
        + "\n- dialog: string (the full dialog with speaker labels and newline separators),"
        + "\n- questions: array of exactly 3 objects, each with fields:\n  - question: string,\n  - choices: array of 3 strings (each starting with 'A. ', 'B. ', 'C. '),\n  - correct: string (the letter of the correct choice: 'A', 'B', or 'C')."
        + "\nExample output format:\n[ {\"dialog\":\"Man: ...\\nWoman: ...\", \"questions\": [{\"question\":\"...\", \"choices\":[\"A. ...\",\"B. ...\",\"C. ...\"], \"correct\":\"B\"}, {...}, {...}] }, ... ]\n"
        + "\nRequirements:\n- DO NOT include any explanation text outside the JSON array.\n- Do NOT include classification labels or extra metadata.\n- Ensure each dialog has exactly 3 question objects.\n- Keep dialogs and questions concise and natural; use everyday spoken language.\n- Ensure the 'correct' field is exactly one of 'A', 'B', or 'C' and matches the correct choice in 'choices'.\n";

    int attempts = 0;
    while (true) {
      attempts++;
      long attemptStart = System.currentTimeMillis();
      try {
        GeneratedDialog[] arr = geminiApiClient.generate(prompt, GeneratedDialog[].class);
        long attemptDur = System.currentTimeMillis() - attemptStart;
        logger.info("generateDialogs attempt {} succeeded in {}ms", attempts, attemptDur);
        List<GeneratedDialog> out = new ArrayList<>();
        if (arr != null) {
          for (GeneratedDialog g : arr)
            out.add(g);
        }
        lastCallUsedFallback.set(false);
        return out;
      } catch (Exception e) {
        long attemptDur = System.currentTimeMillis() - attemptStart;
        logger.warn("generateDialogs attempt {} failed after {}ms: {}", attempts, attemptDur, e.getMessage());
        // if it's a quota error (429) or we've exhausted retries, return a small
        // fallback set
        String msg = e.getMessage() == null ? "" : e.getMessage().toLowerCase();
        boolean isQuota = msg.contains("429") || msg.contains("quota") || msg.contains("exceeded");
        if (isQuota) {
          logger.error("Gemini quota/error detected: {}, returning fallback dialogs", e.getMessage());
          return generateFallbackDialogs(count);
        }
        if (attempts >= 3) {
          logger.error("generateDialogs failed after {} attempts, returning fallback dialogs", attempts, e);
          return generateFallbackDialogs(count);
        }
        try {
          Thread.sleep(500L * attempts);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          return generateFallbackDialogs(count);
        }
      }
    }
  }

  // Simple fallback dialogs used when Gemini API is unavailable or quota is
  // exceeded.
  private List<GeneratedDialog> generateFallbackDialogs(int count) {
    List<GeneratedDialog> out = new ArrayList<>();
    lastCallUsedFallback.set(true);
    for (int i = 0; i < Math.max(1, Math.min(count, 4)); i++) {
      GeneratedDialog g = new GeneratedDialog();
      String dialog = "Man: Hi, are you available to help with the community event?\nWoman: Yes, I can help. What time should I come?\nMan: Let's meet at 9 AM.\nWoman: Great, see you then.";
      g.setDialog(dialog);
      com.example.backend.listening.dto.GeneratedQuestion q1 = new com.example.backend.listening.dto.GeneratedQuestion();
      q1.setQuestion("What time will they meet?");
      q1.setChoices(new String[] { "A. 9 AM", "B. 10 AM", "C. 11 AM" });
      q1.setCorrect("A");
      com.example.backend.listening.dto.GeneratedQuestion q2 = new com.example.backend.listening.dto.GeneratedQuestion();
      q2.setQuestion("Who asked for help?");
      q2.setChoices(new String[] { "A. Woman", "B. Man", "C. Both" });
      q2.setCorrect("B");
      com.example.backend.listening.dto.GeneratedQuestion q3 = new com.example.backend.listening.dto.GeneratedQuestion();
      q3.setQuestion("Will the woman attend?");
      q3.setChoices(new String[] { "A. Yes", "B. No", "C. Maybe" });
      q3.setCorrect("A");
      g.setQuestions(new com.example.backend.listening.dto.GeneratedQuestion[] { q1, q2, q3 });
      out.add(g);
    }
    return out;
  }

  public boolean wasLastCallFallback() {
    return lastCallUsedFallback.get();
  }

}
