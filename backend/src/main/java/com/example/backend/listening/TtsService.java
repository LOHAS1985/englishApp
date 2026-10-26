package com.example.backend.listening;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

/** 会話スクリプトを tts/generate_tts.py(edge-tts)で音声化し、ffmpeg で1ファイルに結合する */
@Service
public class TtsService {

  private static final Logger logger = LoggerFactory.getLogger(TtsService.class);

  private final MeterRegistry meterRegistry;
  private final Counter ttsRequests;
  private final Counter ttsFailures;
  private final Timer ttsPollTimer;

  // Executor for offloading blocking TTS work so request threads are not blocked.
  private final ExecutorService ttsExecutor = Executors
      .newFixedThreadPool(Math.max(2, Runtime.getRuntime().availableProcessors() / 2));

  public TtsService(MeterRegistry meterRegistry) {
    this.meterRegistry = meterRegistry;
    this.ttsRequests = meterRegistry.counter("tts.requests.total");
    this.ttsFailures = meterRegistry.counter("tts.failures.total");
    this.ttsPollTimer = Timer.builder("tts.poll.wait.millis").description("Polling wait time in ms")
        .publishPercentiles(0.5, 0.95).register(meterRegistry);
  }

  @PreDestroy
  public void shutdownExecutor() {
    ttsExecutor.shutdownNow();
  }

  /** 非同期に音声を生成する。結果は {"audioUrl": ...} または {"audioUrls": [...]} */
  public CompletableFuture<Map<String, Object>> synthesizeAsync(String dialog, String base) {
    return CompletableFuture.supplyAsync(() -> {
      ttsRequests.increment();
      try {
        return synthesize(dialog, base);
      } catch (IOException | InterruptedException e) {
        ttsFailures.increment();
        throw new IllegalStateException(e.getMessage(), e);
      }
    }, ttsExecutor);
  }

  private Map<String, Object> synthesize(String dialog, String base) throws IOException, InterruptedException {
    long synthTotalStart = System.currentTimeMillis();
    // compute deterministic key from dialog text to avoid duplicate generation
    MessageDigest md;
    try {
      md = MessageDigest.getInstance("SHA-1");
    } catch (NoSuchAlgorithmException e) {
      throw new IOException("SHA-1 not available");
    }
    byte[] digest = md.digest(dialog.getBytes(StandardCharsets.UTF_8));
    String key = HexFormat.of().formatHex(digest);

    // choose generated dir: use runtime-served filesystem directory
    Path genDir = Path.of("static", "audio", "generated");
    if (!Files.exists(genDir)) {
      try {
        Files.createDirectories(genDir);
      } catch (IOException ioe) {
        throw new IOException("generated dir missing");
      }
    }

    Path finalCombined = genDir.resolve(key + ".mp3");
    if (Files.exists(finalCombined)) {
      long cacheHitDur = System.currentTimeMillis() - synthTotalStart;
      logger.info("synthesize: cache hit for key {}, returning in {}ms", key, cacheHitDur);
      return Map.of("audioUrl", "/audio/generated/" + finalCombined.getFileName().toString());
    }

    // write dialog to temp file for tts script
    Path tmp = Files.createTempFile("dialog", ".txt");
    Files.writeString(tmp, dialog, StandardOpenOption.TRUNCATE_EXISTING);

    // resolve python script path from several common locations
    Path cwd = Path.of(".").toAbsolutePath().normalize();
    Path[] candidates = new Path[] {
        Path.of("tts", "generate_tts.py"),
        Path.of("backend", "tts", "generate_tts.py"),
        Path.of("src", "main", "resources", "tts", "generate_tts.py"),
        Path.of("backend", "src", "main", "resources", "tts", "generate_tts.py")
    };
    Path script = null;
    for (Path cand : candidates) {
      if (Files.exists(cand)) {
        script = cand.toAbsolutePath().normalize();
        break;
      }
    }
    if (script == null) {
      logger.error("synthesize: tts script missing, aborting");
      throw new IOException("tts script missing: cwd=" + cwd.toString());
    }

    // use temp base name to avoid colliding with concurrently generated jobs
    String tempBase = base + "_" + UUID.randomUUID().toString().replace("-", "");

    ProcessBuilder pb = new ProcessBuilder("python", script.toString(), tmp.toAbsolutePath().toString(), tempBase,
        "--out-dir", genDir.toAbsolutePath().toString());
    pb.directory(new File("."));
    pb.redirectErrorStream(true);
    long procStart = System.currentTimeMillis();
    Process proc = pb.start();
    // always capture script stdout/stderr for debugging
    String procOut = new String(proc.getInputStream().readAllBytes());
    int exit = proc.waitFor();
    long procDur = System.currentTimeMillis() - procStart;
    logger.info("synthesize: tts script executed in {}ms (exit={})", procDur, exit);
    logger.debug("synthesize: tts script output: {}", procOut);
    Files.deleteIfExists(tmp);
    if (exit != 0) {
      logger.error("synthesize: tts script failed output: {}", procOut);
      throw new IOException("tts failed: " + procOut);
    }

    // collect files produced for tempBase; allow short polling window in case
    // files appear slightly after the script exits (filesystem sync, background
    // processes, etc.).
    List<Path> generatedFiles = listGenerated(genDir, tempBase);

    if (generatedFiles.isEmpty()) {
      // Poll for a short period waiting for files to appear.
      int maxRetries = 20; // 20 * 250ms = 5s
      int retry = 0;
      Timer.Sample pollSample = Timer.start(meterRegistry);
      while (retry < maxRetries && generatedFiles.isEmpty()) {
        retry++;
        try {
          Thread.sleep(250);
        } catch (InterruptedException ie) {
          Thread.currentThread().interrupt();
          break;
        }
        try {
          generatedFiles = listGenerated(genDir, tempBase);
        } catch (IOException ioe) {
          logger.debug("synthesize: retry {} failed to list dir", retry, ioe);
        }
      }
      pollSample.stop(ttsPollTimer);
      logger.info("synthesize: after polling ({}ms) found {} generated files", retry * 250, generatedFiles.size());

      if (generatedFiles.isEmpty()) {
        logger.error("synthesize: no generated files for tempBase={}, scriptOutput={}", tempBase, procOut);
        ttsFailures.increment();
        throw new IOException("no generated files");
      }
    }

    // If only one file, move it into finalCombined atomically
    if (generatedFiles.size() == 1) {
      moveAtomically(generatedFiles.get(0), finalCombined);
      return Map.of("audioUrl", "/audio/generated/" + finalCombined.getFileName().toString());
    }

    // concatenate with ffmpeg into a temp combined then atomically move to
    // finalCombined
    Path tempCombined = genDir.resolve(tempBase + "_combined.mp3");
    try {
      Path listFile = Files.createTempFile("ffconcat_", ".txt");
      StringBuilder sb = new StringBuilder();
      for (Path filePath : generatedFiles) {
        sb.append("file '").append(filePath.toAbsolutePath().toString().replace("'", "'\\''")).append("'\n");
      }
      Files.writeString(listFile, sb.toString(), StandardOpenOption.TRUNCATE_EXISTING);

      ProcessBuilder ff = new ProcessBuilder("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listFile.toString(),
          "-c:a", "libmp3lame", "-q:a", "2", tempCombined.toString());
      ff.directory(new File("."));
      ff.redirectErrorStream(true);
      Process ffProc = ff.start();
      String ffOut = new String(ffProc.getInputStream().readAllBytes());
      int rc = ffProc.waitFor();
      Files.deleteIfExists(listFile);
      if (rc == 0 && Files.exists(tempCombined)) {
        moveAtomically(tempCombined, finalCombined);
        logger.info("ffmpeg success, combined file created: {}", finalCombined);
        // cleanup per-line files for tempBase
        for (Path p : generatedFiles) {
          Files.deleteIfExists(p);
        }
        return Map.of("audioUrl", "/audio/generated/" + finalCombined.getFileName().toString());
      }
      logger.warn("ffmpeg failed (rc={}) output:\n{}", rc, ffOut);
    } catch (IOException | InterruptedException e) {
      logger.warn("ffmpeg concat failed, returning per-line files", e);
    }

    List<String> urls = generatedFiles.stream()
        .map(path -> "/audio/generated/" + path.getFileName().toString())
        .collect(Collectors.toList());
    logger.info("synthesize: returning {} urls (total {}ms)", urls.size(),
        System.currentTimeMillis() - synthTotalStart);
    return Map.of("audioUrls", urls);
  }

  private List<Path> listGenerated(Path genDir, String tempBase) throws IOException {
    try (var files = Files.list(genDir)) {
      return files.filter(path -> path.getFileName().toString().startsWith(tempBase))
          .sorted()
          .collect(Collectors.toList());
    }
  }

  private void moveAtomically(Path from, Path to) throws IOException {
    try {
      Files.move(from, to, StandardCopyOption.ATOMIC_MOVE);
    } catch (IOException e) {
      Files.move(from, to, StandardCopyOption.REPLACE_EXISTING);
    }
  }
}
