package com.example.backend.speaking;

import com.example.backend.config.CurrentUserProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/speaking")
public class SpeakingController {

  private final RecordingService recordingService;
  private final CurrentUserProvider currentUserProvider;

  public SpeakingController(RecordingService recordingService, CurrentUserProvider currentUserProvider) {
    this.recordingService = recordingService;
    this.currentUserProvider = currentUserProvider;
  }

  @PostMapping("/recordings")
  public ResponseEntity<?> uploadRecording(@RequestParam("file") MultipartFile file,
      @RequestParam(value = "exerciseId", required = false) Long exerciseId) {
    try {
      Recording r = recordingService.save(file, currentUserProvider.getCurrentUser().getId());
      return ResponseEntity.ok(Map.of("recordingId", r.getId()));
    } catch (IOException e) {
      return ResponseEntity.status(500).body(Map.of("error", "upload failed"));
    }
  }
}
