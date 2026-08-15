package com.example.backend.vocab;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final WordService wordService;
  private final WordRepository wordRepository;

  public AdminController(WordService wordService, WordRepository wordRepository) {
    this.wordService = wordService;
    this.wordRepository = wordRepository;
  }

  @PostMapping("/words")
  public ResponseEntity<?> createWord(@RequestBody Map<String, String> body) {
    String word = body.get("word");
    String meaningEn = body.get("meaningEn");
    String exampleEn = body.get("exampleEn");

    if (word == null || word.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "word is required"));
    }
    // prevent duplicates
    if (wordRepository.existsByWord(word)) {
      return ResponseEntity.status(409).body(Map.of("error", "already exists"));
    }

    Word saved = wordService.fetchAndSave(word.trim().toLowerCase(), meaningEn, exampleEn);
    return ResponseEntity.ok(saved);
  }

  @GetMapping("/users")
  public ResponseEntity<?> users() {
    // placeholder: real implementation should return user list with auth checks
    return ResponseEntity.ok(Map.of());
  }

  @GetMapping("/words")
  public ResponseEntity<?> listWords() {
    return ResponseEntity.ok(wordRepository.findAll());
  }
}
