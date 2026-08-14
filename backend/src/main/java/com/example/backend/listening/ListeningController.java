package com.example.backend.listening;

import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.stream.Collectors;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import jakarta.annotation.PreDestroy;
import jakarta.annotation.PostConstruct;

import com.example.backend.listening.dto.GeneratedDialog;
import com.example.backend.listening.dto.GeneratedQuestion;

@RestController
@RequestMapping("/api/listening")
public class ListeningController {

  private static final Logger logger = LoggerFactory.getLogger(ListeningController.class);

  // in-memory answer key for demo exercises (id -> correct choice letter)
  private static final Map<Long, String> ANSWER_KEY = new ConcurrentHashMap<>();

  @Autowired
  private ListeningGeminiService listeningGeminiService;
  @Autowired
  private MeterRegistry meterRegistry;

  private Counter ttsRequests;
  private Counter ttsFailures;
  private Timer ttsPollTimer;

  // Executor for offloading blocking TTS work so request threads are not blocked.
  private final ExecutorService ttsExecutor = Executors
      .newFixedThreadPool(Math.max(2, Runtime.getRuntime().availableProcessors() / 2));

  @PostConstruct
  public void initMetrics() {
    try {
      ttsRequests = meterRegistry.counter("tts.requests.total");
      ttsFailures = meterRegistry.counter("tts.failures.total");
      ttsPollTimer = Timer.builder("tts.poll.wait.millis").description("Polling wait time in ms")
          .publishPercentiles(0.5, 0.95).register(meterRegistry);
    } catch (Exception e) {
      logger.warn("initMetrics: failed to initialize metrics", e);
    }
  }

  @GetMapping("/exercises")
  public ResponseEntity<?> listExercises(@RequestParam(name = "count", required = false) Integer count) {
    // Prefer Gemini-generated dialogs for exercises rather than inline static
    // dialogs.
    int desired = (count == null || count <= 0) ? 4 : Math.min(Math.max(count, 1), 12);
    ANSWER_KEY.clear();
    List<GeneratedDialog> gen;
    long genStart = System.currentTimeMillis();
    try {
      gen = listeningGeminiService.generateDialogs(desired);
    } catch (Exception e) {
      long genDur = System.currentTimeMillis() - genStart;
      logger.error("listExercises: generateDialogs failed after {}ms", genDur, e);
      return ResponseEntity.status(500).body(Map.of("error", "generateDialogs failed: " + e.getMessage()));
    }
    long genDur = System.currentTimeMillis() - genStart;
    logger.info("listExercises: generateDialogs returned {} items in {}ms", gen == null ? 0 : gen.size(), genDur);
    // filter out invalid/placeholder dialogs
    long filterStart = System.currentTimeMillis();
    List<GeneratedDialog> filtered = gen.stream().filter(this::isValidGeneratedDialog).collect(Collectors.toList());
    long filterDur = System.currentTimeMillis() - filterStart;
    if (filtered.size() < (gen == null ? 0 : gen.size())) {
      logger.info("listExercises: filtered out {} invalid generated dialogs (filterTime={}ms)",
          gen.size() - filtered.size(), filterDur);
    } else {
      logger.info("listExercises: filtering completed ({}ms)", filterDur);
    }

    List<ListeningExercise> out = new ArrayList<>();
    long buildStart = System.currentTimeMillis();
    long baseId = System.currentTimeMillis() % 100000;
    long idCounter = 0;
    for (int i = 0; i < Math.min(desired, filtered.size()); i++) {
      GeneratedDialog g = filtered.get(i);
      if (g.getQuestions() == null)
        continue;
      // For each dialog, produce up to 3 questions (TOEIC Part 3/4 style)
      for (int q = 0; q < Math.min(3, g.getQuestions().length); q++) {
        var ques = g.getQuestions()[q];
        long id = baseId + (++idCounter);

        String[] choices = ques.getChoices();
        if (choices == null)
          choices = new String[0];

        List<String> cs = new ArrayList<>();
        for (int j = 0; j < Math.min(3, choices.length); j++)
          cs.add(choices[j]);
        while (cs.size() < 3)
          cs.add("---");

        // interpret correct: may be 'A'/'B'/'C' or full text
        int correctIdx = 0;
        String correct = ques.getCorrect();
        if (correct != null) {
          String c = correct.trim();
          if (c.length() == 1 && (c.equalsIgnoreCase("A") || c.equalsIgnoreCase("B") || c.equalsIgnoreCase("C"))) {
            correctIdx = c.toUpperCase().charAt(0) - 'A';
          } else {
            for (int j = 0; j < cs.size(); j++)
              if (cs.get(j).equals(c)) {
                correctIdx = j;
                break;
              }
          }
        }

        ListeningExercise ex = new ListeningExercise(id, "AI Generated: " + (i + 1), null, g.getDialog(),
            ques.getQuestion(), cs.toArray(new String[0]));
        ANSWER_KEY.put(id, String.valueOf((char) ('A' + correctIdx)));
        out.add(ex);
      }
    }

    if (listeningGeminiService.wasLastCallFallback()) {
      long buildDur = System.currentTimeMillis() - buildStart;
      logger.info("listExercises: built {} exercises in {}ms (fallback)", out.size(), buildDur);
      return ResponseEntity.ok().header("X-AI-Quota", "fallback").body(out);
    }
    long buildDur = System.currentTimeMillis() - buildStart;
    logger.info("listExercises: built {} exercises in {}ms", out.size(), buildDur);
    return ResponseEntity.ok(out);
  }

  @GetMapping("/generate")
  public ResponseEntity<?> generateWithGemini(@RequestParam(name = "count", required = false) Integer count) {
    int n = (count == null || count <= 0) ? 4 : Math.min(Math.max(count, 1), 50);
    List<GeneratedDialog> gen = listeningGeminiService.generateDialogs(n);
    List<ListeningExercise> out = new ArrayList<>();
    long baseId = System.currentTimeMillis() % 100000;
    long idCounter2 = 0;
    for (int i = 0; i < gen.size(); i++) {
      GeneratedDialog g = gen.get(i);
      if (g.getQuestions() == null)
        continue;
      for (int q = 0; q < Math.min(3, g.getQuestions().length); q++) {
        var ques = g.getQuestions()[q];
        long id = baseId + (++idCounter2);
        String[] choices = ques.getChoices();
        if (choices == null)
          choices = new String[0];
        ListeningExercise ex = new ListeningExercise(id, "AI Generated: " + (i + 1), "/audio/toeic_sample1.mp3",
            g.getDialog(), ques.getQuestion(), choices);
        // find index of correct
        int correctIdx = 0;
        String corr = ques.getCorrect();
        for (int j = 0; j < choices.length; j++) {
          if (choices[j].equals(corr)) {
            correctIdx = j;
            break;
          }
        }
        ANSWER_KEY.put(id, String.valueOf((char) ('A' + correctIdx)));
        out.add(ex);
      }
    }
    if (listeningGeminiService.wasLastCallFallback()) {
      return ResponseEntity.ok().header("X-AI-Quota", "fallback").body(out);
    }
    return ResponseEntity.ok(out);
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

    String correct = ANSWER_KEY.get(id);
    boolean ok = correct != null && correct.equalsIgnoreCase(String.valueOf(answer));
    return ResponseEntity
        .ok(Map.of("score", ok ? 1 : 0, "correct", ok, "correctAnswer", correct == null ? "" : correct));
  }

  @PostMapping("/synthesize")
  public CompletableFuture<ResponseEntity<?>> synthesize(@RequestBody Map<String, String> body) {
    String dialog = body.get("dialogText");
    String base = body.getOrDefault("base", "toeic_" + System.currentTimeMillis());
    logger.info("synthesize called, base={}, dialogLen={}", base, dialog == null ? 0 : dialog.length());
    if (dialog == null || dialog.isBlank()) {
      return CompletableFuture
          .completedFuture(ResponseEntity.badRequest().body(Map.of("error", "dialogText required")));
    }

    return CompletableFuture.supplyAsync(() -> {
      try {
        Map<String, Object> res = synthesizeInternal(dialog, base);
        return ResponseEntity.ok(res);
      } catch (IOException | InterruptedException e) {
        logger.error("synthesize failed", e);
        return ResponseEntity.status(500).body(Map.of("error", e.getMessage(), "detail", e.toString()));
      }
    }, ttsExecutor);
  }

  @PreDestroy
  public void shutdownExecutor() {
    try {
      ttsExecutor.shutdownNow();
    } catch (Exception ignored) {
    }
  }

  // shared synthesize implementation used by endpoints
  private Map<String, Object> synthesizeInternal(String dialog, String base) throws IOException, InterruptedException {
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

    // choose generated dir
    Path genDir1 = Path.of("src", "main", "resources", "static", "audio", "generated");
    Path genDir2 = Path.of("backend", "src", "main", "resources", "static", "audio", "generated");
    Path genDir = Files.exists(genDir1) ? genDir1 : genDir2;
    if (!Files.exists(genDir)) {
      try {
        Files.createDirectories(genDir2);
        genDir = genDir2;
      } catch (IOException ioe) {
        throw new IOException("generated dir missing");
      }
    }

    Path finalCombined = genDir.resolve(key + ".mp3");
    if (Files.exists(finalCombined)) {
      long cacheHitDur = System.currentTimeMillis() - synthTotalStart;
      logger.info("synthesizeInternal: cache hit for key {}, returning in {}ms", key, cacheHitDur);
      String url = "/audio/generated/" + finalCombined.getFileName().toString();
      return Map.of("audioUrl", url);
    }

    // write dialog to temp file for tts script
    long writeStart = System.currentTimeMillis();
    Path tmp = Files.createTempFile("dialog", ".txt");
    Files.writeString(tmp, dialog, StandardOpenOption.TRUNCATE_EXISTING);
    long writeDur = System.currentTimeMillis() - writeStart;
    logger.info("synthesizeInternal: wrote dialog temp file {} ({}ms)", tmp.toString(), writeDur);

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
      long totalDur = System.currentTimeMillis() - synthTotalStart;
      logger.error("synthesizeInternal: tts script missing, aborting (total {}ms)", totalDur);
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
    int exit = proc.waitFor();
    long procDur = System.currentTimeMillis() - procStart;
    // always capture script stdout/stderr for debugging
    String procOut = new String(proc.getInputStream().readAllBytes());
    logger.info("synthesizeInternal: tts script executed in {}ms (exit={})", procDur, exit);
    logger.debug("synthesizeInternal: tts script output: {}", procOut);
    if (exit != 0) {
      logger.error("synthesizeInternal: tts script failed output: {}", procOut);
      throw new IOException("tts failed: " + procOut);
    }

    // collect files produced for tempBase; allow short polling window in case
    // files appear slightly after the script exits (filesystem sync, background
    // processes, etc.).
    long collectStart = System.currentTimeMillis();
    List<Path> generatedFiles = Files.list(genDir)
        .filter(path -> path.getFileName().toString().startsWith(tempBase))
        .sorted()
        .collect(Collectors.toList());
    long collectDur = System.currentTimeMillis() - collectStart;
    logger.info("synthesizeInternal: initial found {} generated files in {}ms", generatedFiles.size(), collectDur);

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
          generatedFiles = Files.list(genDir)
              .filter(path -> path.getFileName().toString().startsWith(tempBase))
              .sorted()
              .collect(Collectors.toList());
        } catch (IOException ioe) {
          logger.debug("synthesizeInternal: retry {} failed to list dir", retry, ioe);
        }
      }
      long totalPollMs = retry * 250;
      try {
        pollSample.stop(meterRegistry.timer("tts.poll.wait.millis"));
      } catch (Exception ignored) {
      }
      logger.info("synthesizeInternal: after polling ({}ms) found {} generated files", totalPollMs,
          generatedFiles.size());

      if (generatedFiles.isEmpty()) {
        // log directory snapshot for debugging when no files were produced
        try {
          List<String> snapshot = Files.list(genDir)
              .map(p -> {
                try {
                  return String.format("%s %d", p.getFileName().toString(), Files.size(p));
                } catch (IOException e) {
                  return String.format("%s -", p.getFileName().toString());
                }
              })
              .limit(50)
              .collect(Collectors.toList());
          logger.error("synthesizeInternal: no generated files for tempBase={}, scriptOutput={}, dirSnapshot={}",
              tempBase, procOut, snapshot);
          try {
            meterRegistry.counter("tts.failures.total").increment();
          } catch (Exception ignored) {
          }
        } catch (IOException ioe) {
          logger.error("synthesizeInternal: no generated files and failed to list dir", ioe);
        }
        throw new IOException("no generated files");
      }
    }

    // If only one file, move it into finalCombined atomically
    if (generatedFiles.size() == 1) {
      Path only = generatedFiles.get(0);
      try {
        Files.move(only, finalCombined, StandardCopyOption.ATOMIC_MOVE);
      } catch (IOException e) {
        Files.move(only, finalCombined, StandardCopyOption.REPLACE_EXISTING);
      }
      String url = "/audio/generated/" + finalCombined.getFileName().toString();
      return Map.of("audioUrl", url);
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
      if (rc == 0 && Files.exists(tempCombined)) {
        try {
          Files.move(tempCombined, finalCombined, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
          Files.move(tempCombined, finalCombined, StandardCopyOption.REPLACE_EXISTING);
        }
        String url = "/audio/generated/" + finalCombined.getFileName().toString();
        logger.info("ffmpeg success, combined file created: {} -> {}", tempCombined.toString(),
            finalCombined.toString());
        // optional: cleanup per-line files for tempBase
        for (Path p : generatedFiles) {
          try {
            Files.deleteIfExists(p);
          } catch (IOException ignored) {
          }
        }
        return Map.of("audioUrl", url);
      } else {
        logger.warn("ffmpeg failed (rc={}) output:\n{}", rc, ffOut);
      }
    } catch (IOException | InterruptedException e) {
      // ignore and fallback
    }

    List<String> urls = generatedFiles.stream()
        .map(path -> "/audio/generated/" + path.getFileName().toString())
        .collect(Collectors.toList());

    long totalDur = System.currentTimeMillis() - synthTotalStart;
    logger.info("synthesizeInternal: returning {} urls (total {}ms)", urls.size(), totalDur);
    return Map.of("audioUrls", urls);
  }

  @PostMapping("/auto-generate")
  public ResponseEntity<?> autoGenerate(@RequestParam(name = "count", required = false) Integer count) {
    int n = (count == null || count <= 0) ? 4 : Math.min(Math.max(count, 1), 20);
    List<GeneratedDialog> gen = listeningGeminiService.generateDialogs(n);
    // validate generated dialogs and skip any with placeholder patterns
    List<GeneratedDialog> filtered = gen.stream().filter(this::isValidGeneratedDialog).collect(Collectors.toList());
    if (filtered.size() < gen.size()) {
      logger.info("auto-generate: filtered out {} invalid generated dialogs", gen.size() - filtered.size());
    }
    List<ListeningExercise> out = new ArrayList<>();
    long baseId = System.currentTimeMillis() % 100000;
    long idCounter3 = 0;
    for (int i = 0; i < filtered.size(); i++) {
      GeneratedDialog g = filtered.get(i);
      if (g.getQuestions() == null)
        continue;
      // synthesize once per dialog
      long synthId = baseId + i + 1;
      String audioUrl = "/audio/toeic_sample1.mp3";
      try {
        String base = "ai_" + synthId;
        Map<String, Object> synth = synthesizeInternal(g.getDialog(), base);
        if (synth.containsKey("audioUrl")) {
          audioUrl = String.valueOf(synth.get("audioUrl"));
        } else if (synth.containsKey("audioUrls")) {
          List<?> arr = (List<?>) synth.get("audioUrls");
          if (!arr.isEmpty())
            audioUrl = String.valueOf(arr.get(0));
        }
      } catch (Exception e) {
        logger.warn("auto synth failed for ai dialog {}: {}", synthId, e.getMessage());
      }

      for (int q = 0; q < Math.min(3, g.getQuestions().length); q++) {
        var ques = g.getQuestions()[q];
        long id = baseId + (++idCounter3);
        String[] choices = ques.getChoices();
        if (choices == null)
          choices = new String[0];

        ListeningExercise ex = new ListeningExercise(id, "AI Generated: " + (i + 1), audioUrl, g.getDialog(),
            ques.getQuestion(), choices);

        // determine correct index: support both 'A'/'B'/'C' letter or full text match
        int correctIdx = 0;
        String correct = ques.getCorrect();
        if (correct != null) {
          String c = correct.trim();
          if (c.length() == 1 && (c.equalsIgnoreCase("A") || c.equalsIgnoreCase("B") || c.equalsIgnoreCase("C"))) {
            correctIdx = c.toUpperCase().charAt(0) - 'A';
          } else {
            for (int j = 0; j < choices.length; j++) {
              if (choices[j].equals(c)) {
                correctIdx = j;
                break;
              }
            }
          }
        }
        ANSWER_KEY.put(id, String.valueOf((char) ('A' + correctIdx)));
        out.add(ex);
      }
    }
    if (listeningGeminiService.wasLastCallFallback()) {
      return ResponseEntity.ok().header("X-AI-Quota", "fallback").body(out);
    }
    return ResponseEntity.ok(out);
  }

  // Validate generated dialog: reject dialogs or choices containing underscored
  // blanks or words like 'blank' or 'underscore'
  private boolean isValidGeneratedDialog(GeneratedDialog g) {
    if (g == null)
      return false;
    String dialog = g.getDialog();
    GeneratedQuestion[] questions = g.getQuestions();
    if (dialog == null || questions == null || questions.length == 0)
      return false;

    StringBuilder sb = new StringBuilder(dialog == null ? "" : dialog);
    for (GeneratedQuestion qq : questions) {
      if (qq == null)
        return false;
      String qtext = qq.getQuestion();
      if (qtext == null)
        return false;
      sb.append(" ").append(qtext);
      String[] ch = qq.getChoices();
      if (ch == null)
        return false;
      for (String s : ch)
        sb.append(" ").append(s);
    }
    String combined = sb.toString().toLowerCase();
    // reject if underscores or placeholder tokens appear
    if (combined.contains("___") || combined.contains("____") || combined.contains("underscore")
        || combined.contains("blank") || combined.contains("_"))
      return false;
    return true;
  }
}
