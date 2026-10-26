package com.example.backend.speaking;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

@Service
public class RecordingService {

  private final RecordingRepository repo;
  private final Path uploadDir = Path.of("uploads", "recordings");

  public RecordingService(RecordingRepository repo) {
    this.repo = repo;
    try {
      Files.createDirectories(uploadDir);
    } catch (IOException e) {
      throw new RuntimeException("Could not create upload dir", e);
    }
  }

  public Recording save(MultipartFile file, Long userId) throws IOException {
    // クライアント由来のファイル名はパス区切り等を含み得るため、英数字・._- 以外を除去する
    String original = file.getOriginalFilename();
    String safeName = original == null ? "upload" : original.replaceAll("[^A-Za-z0-9._-]", "_");
    String filename = System.currentTimeMillis() + "-" + safeName;
    Path target = uploadDir.resolve(filename);
    try (var in = file.getInputStream()) {
      Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
    }

    Recording r = new Recording();
    r.setUserId(userId);
    r.setFilename(filename);
    r.setDurationMs(null);
    r.setTranscript(null);
    r.setScore(null);
    return repo.save(r);
  }
}
