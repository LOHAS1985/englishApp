package com.example.backend.listening;

import com.example.backend.writing.GeminiApiClient;
import com.example.backend.listening.dto.GeneratedDialog;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ListeningGeminiService {

  private final GeminiApiClient geminiApiClient;

  public ListeningGeminiService(GeminiApiClient geminiApiClient) {
    this.geminiApiClient = geminiApiClient;
  }

  public List<GeneratedDialog> generateDialogs(int count) {
    if (count <= 0)
      count = 4;
    String prompt = "You are an expert creator of long multi-turn dialogue listening exercises (TOEIC Part 3/4 style)."
        + "\nGenerate " + count
        + " unique dialogs. Each dialog must be a natural conversation between multiple speakers (2 or 3 different speakers) and be long enough to support multiple comprehension questions."
        + "\nStructure each dialog as 4-10 short speaker lines, each line starting with a speaker label (e.g. 'Man:', 'Woman:', 'Student:', 'Announcer:')."
        + "\nFor each dialog, provide EXACTLY THREE distinct listening-comprehension questions about that dialog. Each question should be a separate object and should test different aspects (detail, main idea, inference)."
        + "\nFor each question, provide exactly three answer choices (A, B, C). One choice must be correct."
        + "\nReturn the result strictly as a JSON array of objects with the fields:"
        + "\n- dialog: string (the full dialog with speaker labels and newline separators),"
        + "\n- questions: array of exactly 3 objects, each with fields:\n  - question: string,\n  - choices: array of 3 strings (each starting with 'A. ', 'B. ', 'C. '),\n  - correct: string (the letter of the correct choice: 'A', 'B', or 'C')."
        + "\nExample output format:\n[ {\"dialog\":\"Announcer: ...\\nStudent: ...\", \"questions\": [{\"question\":\"...\", \"choices\":[\"A. ...\",\"B. ...\",\"C. ...\"], \"correct\":\"B\"}, {...}, {...}] }, ... ]\n"
        + "\nRequirements:\n- DO NOT include any explanation text outside the JSON array.\n- Do NOT include classification labels or extra metadata.\n- Ensure each dialog has exactly 3 question objects.\n- Keep dialogs and questions concise and natural; use everyday spoken language.\n- Ensure the 'correct' field is exactly one of 'A', 'B', or 'C' and matches the correct choice in 'choices'.\n";

    GeneratedDialog[] arr = geminiApiClient.generate(prompt, GeneratedDialog[].class);
    List<GeneratedDialog> out = new ArrayList<>();
    if (arr != null) {
      for (GeneratedDialog g : arr)
        out.add(g);
    }
    return out;
  }
}
