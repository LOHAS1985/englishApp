package com.example.backend.vocab;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
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

    try {
      Word saved = wordService.fetchAndSave(word.trim().toLowerCase(), meaningEn, exampleEn);
      return ResponseEntity.ok(saved);
    } catch (IllegalStateException exception) {
      return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
          .body(Map.of("error", exception.getMessage()));
    }
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

  @PutMapping("/words/{id}")
  public ResponseEntity<?> updateWord(@PathVariable Long id, @RequestBody Map<String, String> body) {
    Word word = wordRepository.findById(id).orElse(null);
    if (word == null) {
      return ResponseEntity.notFound().build();
    }

    String updatedWord = body.get("word");
    if (updatedWord == null || updatedWord.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "word is required"));
    }
    if (!word.getWord().equalsIgnoreCase(updatedWord.trim()) && wordRepository.existsByWord(updatedWord.trim())) {
      return ResponseEntity.status(409).body(Map.of("error", "already exists"));
    }

    word.setWord(updatedWord.trim().toLowerCase());
    word.setMeaningEn(body.get("meaningEn"));
    word.setExampleEn(body.get("exampleEn"));
    word.setMeaningJa(body.get("meaningJa"));
    word.setExampleJa(body.get("exampleJa"));
    return ResponseEntity.ok(wordRepository.save(word));
  }

  @DeleteMapping("/words/{id}")
  public ResponseEntity<?> deleteWord(@PathVariable Long id) {
    if (!wordRepository.existsById(id)) {
      return ResponseEntity.notFound().build();
    }
    wordRepository.deleteById(id);
    return ResponseEntity.noContent().build();
  }
}
