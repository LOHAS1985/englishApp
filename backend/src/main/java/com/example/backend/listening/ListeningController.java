package com.example.backend.listening;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/listening")
public class ListeningController {

  private static final Logger logger = LoggerFactory.getLogger(ListeningController.class);

  private final ListeningService listeningService;
  private final TtsService ttsService;

  public ListeningController(ListeningService listeningService, TtsService ttsService) {
    this.listeningService = listeningService;
    this.ttsService = ttsService;
  }

  @GetMapping("/exercises")
  public ResponseEntity<?> listExercises(@RequestParam(name = "count", required = false) Integer count) {
    int desired = (count == null || count <= 0) ? 4 : Math.min(Math.max(count, 1), 12);
    ListeningService.ExerciseBatch batch;
    try {
      batch = listeningService.createExercises(desired);
    } catch (Exception e) {
      logger.error("listExercises: createExercises failed", e);
      return ResponseEntity.status(500).body(Map.of("error", "generateDialogs failed: " + e.getMessage()));
    }
    if (batch.fallback()) {
      return ResponseEntity.ok().header("X-AI-Quota", "fallback").body(batch.exercises());
    }
    return ResponseEntity.ok(batch.exercises());
  }

  @PostMapping("/submit")
  public ResponseEntity<?> submitAnswer(@RequestBody Map<String, Object> body) {
    Object exId = body.get("exerciseId");
    Object answer = body.get("answer");
    if (exId == null || answer == null) {
      return ResponseEntity.badRequest().body(Map.of("error", "exerciseId and answer required"));
    }
    Long id;
    try {
      id = Long.valueOf(String.valueOf(exId));
    } catch (NumberFormatException e) {
      return ResponseEntity.badRequest().body(Map.of("error", "invalid exerciseId"));
    }
    try {
      return ResponseEntity.ok(listeningService.submit(id, String.valueOf(answer)));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/synthesize")
  public CompletableFuture<ResponseEntity<?>> synthesize(@RequestBody Map<String, String> body) {
    String dialog = body.get("dialogText");
    String base = body.getOrDefault("base", "toeic_" + System.currentTimeMillis());
    if (dialog == null || dialog.isBlank()) {
      return CompletableFuture
          .completedFuture(ResponseEntity.badRequest().body(Map.of("error", "dialogText required")));
    }
    // base はファイル名の一部になるため、英数字・_- 以外を除去する
    String safeBase = base.replaceAll("[^A-Za-z0-9_-]", "_");

    return ttsService.synthesizeAsync(dialog, safeBase)
        .<ResponseEntity<?>>thenApply(ResponseEntity::ok)
        .exceptionally(e -> {
          logger.error("synthesize failed", e);
          return ResponseEntity.status(500).body(Map.of("error", String.valueOf(e.getMessage())));
        });
  }
}
