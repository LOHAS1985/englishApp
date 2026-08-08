package com.example.backend.listening;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/listening")
public class ListeningController {

  @GetMapping("/exercises")
  public ResponseEntity<?> listExercises() {
    // return a single sample exercise (audio hosted externally)
    ListeningExercise ex = new ListeningExercise(1L,
        "Sample listening",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
    return ResponseEntity.ok(List.of(ex));
  }

  @PostMapping("/submit")
  public ResponseEntity<?> submitAnswer(@RequestBody Map<String, Object> body) {
    Object exId = body.get("exerciseId");
    Object answer = body.get("answer");
    // very simple check: if answer equals "A" return correct
    boolean ok = "A".equalsIgnoreCase(String.valueOf(answer));
    return ResponseEntity.ok(Map.of("score", ok ? 1 : 0, "correct", ok));
  }
}
