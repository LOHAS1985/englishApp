package com.example.backend.listening;

import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.Random;
import java.util.Collections;
import java.util.regex.Pattern;
import java.util.regex.Matcher;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

import com.example.backend.listening.dto.GeneratedDialog;
import com.example.backend.listening.ListeningGeminiService;

@RestController
@RequestMapping("/api/listening")
public class ListeningController {

  private static final Logger logger = LoggerFactory.getLogger(ListeningController.class);

  // in-memory answer key for demo exercises (id -> correct choice letter)
  private static final Map<Long, String> ANSWER_KEY = new ConcurrentHashMap<>();

  @Autowired
  private ListeningGeminiService listeningGeminiService;

  @GetMapping("/exercises")
  public ResponseEntity<?> listExercises(@RequestParam(name = "count", required = false) Integer count) {
    // Prefer Gemini-generated dialogs for exercises rather than inline static
    // dialogs.
    int desired = (count == null || count <= 0) ? 4 : Math.min(Math.max(count, 1), 12);
    ANSWER_KEY.clear();

    List<GeneratedDialog> gen = listeningGeminiService.generateDialogs(desired);
    // filter out invalid/placeholder dialogs
    List<GeneratedDialog> filtered = gen.stream().filter(this::isValidGeneratedDialog).collect(Collectors.toList());
    if (filtered.size() < gen.size()) {
      logger.info("listExercises: filtered out {} invalid generated dialogs", gen.size() - filtered.size());
    }

    List<ListeningExercise> out = new ArrayList<>();
    long baseId = System.currentTimeMillis() % 100000;
    for (int i = 0; i < Math.min(desired, filtered.size()); i++) {
      GeneratedDialog g = filtered.get(i);
      long id = baseId + i + 1;
      String[] choices = g.getChoices();
      if (choices == null)
        choices = new String[0];

      // normalize to at least 3 choices; backend will not produce 'Fill the blank'
      List<String> cs = new ArrayList<>();
      for (int j = 0; j < Math.min(3, choices.length); j++)
        cs.add(choices[j]);
      while (cs.size() < 3)
        cs.add("---");

      // interpret correct: may be 'A'/'B'/'C' or full text
      int correctIdx = 0;
      String correct = g.getCorrect();
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

      ListeningExercise ex = new ListeningExercise(id, "AI Generated: " + (i + 1), null, g.getDialog(), g.getQuestion(),
          cs.toArray(new String[0]));
      ANSWER_KEY.put(id, String.valueOf((char) ('A' + correctIdx)));
      out.add(ex);
    }

    return ResponseEntity.ok(out);
  }

  @GetMapping("/generate")
  public ResponseEntity<?> generateWithGemini(@RequestParam(name = "count", required = false) Integer count) {
    int n = (count == null || count <= 0) ? 4 : Math.min(Math.max(count, 1), 50);
    List<GeneratedDialog> gen = listeningGeminiService.generateDialogs(n);
    List<ListeningExercise> out = new ArrayList<>();
    long baseId = System.currentTimeMillis() % 100000;
    for (int i = 0; i < gen.size(); i++) {
      GeneratedDialog g = gen.get(i);
      long id = baseId + i + 1;
      String[] choices = g.getChoices();
      if (choices == null)
        choices = new String[0];
      ListeningExercise ex = new ListeningExercise(id, "AI Generated: " + (i + 1), "/audio/toeic_sample1.mp3",
          g.getDialog(), g.getQuestion(), choices);
      // find index of correct
      int correctIdx = 0;
      for (int j = 0; j < choices.length; j++) {
        if (choices[j].equals(g.getCorrect())) {
          correctIdx = j;
          break;
        }
      }
      ANSWER_KEY.put(id, String.valueOf((char) ('A' + correctIdx)));
      out.add(ex);
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
    return ResponseEntity.ok(Map.of("score", ok ? 1 : 0, "correct", ok));
  }

  @PostMapping("/synthesize")
  public ResponseEntity<?> synthesize(@RequestBody Map<String, String> body) {
    String dialog = body.get("dialogText");
    String base = body.getOrDefault("base", "toeic_" + System.currentTimeMillis());
    logger.info("synthesize called, base={}, dialogLen={}", base, dialog == null ? 0 : dialog.length());
    if (dialog == null || dialog.isBlank()) {
      return ResponseEntity.badRequest().body(Map.of("error", "dialogText required"));
    }

    try {
      Map<String, Object> res = synthesizeInternal(dialog, base);
      return ResponseEntity.ok(res);
    } catch (IOException | InterruptedException e) {
      return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
    }
  }

  // shared synthesize implementation used by endpoints
  private Map<String, Object> synthesizeInternal(String dialog, String base) throws IOException, InterruptedException {
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
      String url = "/audio/generated/" + finalCombined.getFileName().toString();
      return Map.of("audioUrl", url);
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
      throw new IOException("tts script missing: cwd=" + cwd.toString());
    }

    // use temp base name to avoid colliding with concurrently generated jobs
    String tempBase = base + "_" + UUID.randomUUID().toString().replace("-", "");

    ProcessBuilder pb = new ProcessBuilder("python", script.toString(), tmp.toAbsolutePath().toString(), tempBase);
    pb.directory(new File("."));
    pb.redirectErrorStream(true);
    Process proc = pb.start();
    int exit = proc.waitFor();
    if (exit != 0) {
      String out = new String(proc.getInputStream().readAllBytes());
      throw new IOException("tts failed: " + out);
    }

    // collect files produced for tempBase
    List<Path> generatedFiles = Files.list(genDir)
        .filter(path -> path.getFileName().toString().startsWith(tempBase))
        .sorted()
        .collect(Collectors.toList());

    if (generatedFiles.isEmpty()) {
      throw new IOException("no generated files");
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
    for (int i = 0; i < filtered.size(); i++) {
      GeneratedDialog g = filtered.get(i);
      long id = baseId + i + 1;
      String[] choices = g.getChoices();
      if (choices == null)
        choices = new String[0];
      // synthesize the dialog and obtain audio URL(s)
      String audioUrl = "/audio/toeic_sample1.mp3";
      try {
        String base = "ai_" + id;
        Map<String, Object> synth = synthesizeInternal(g.getDialog(), base);
        if (synth.containsKey("audioUrl")) {
          audioUrl = String.valueOf(synth.get("audioUrl"));
        } else if (synth.containsKey("audioUrls")) {
          List<?> arr = (List<?>) synth.get("audioUrls");
          if (!arr.isEmpty())
            audioUrl = String.valueOf(arr.get(0));
        }
      } catch (Exception e) {
        logger.warn("auto synth failed for ai dialog {}: {}", id, e.getMessage());
      }

      ListeningExercise ex = new ListeningExercise(id, "AI Generated: " + (i + 1), audioUrl, g.getDialog(),
          g.getQuestion(), choices);

      // determine correct index: support both 'A'/'B'/'C' letter or full text match
      int correctIdx = 0;
      String correct = g.getCorrect();
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
    return ResponseEntity.ok(out);
  }

  // Validate generated dialog: reject dialogs or choices containing underscored
  // blanks or words like 'blank' or 'underscore'
  private boolean isValidGeneratedDialog(GeneratedDialog g) {
    if (g == null)
      return false;
    String dialog = g.getDialog();
    String question = g.getQuestion();
    String[] choices = g.getChoices();
    if (dialog == null || question == null || choices == null)
      return false;
    String combined = (dialog + " " + question + " " + String.join(" ", choices)).toLowerCase();
    // reject if underscores or placeholder tokens appear
    if (combined.contains("___") || combined.contains("____") || combined.contains("underscore")
        || combined.contains("blank"))
      return false;
    // reject if dialog contains literal '_' characters
    if (dialog.indexOf('_') >= 0)
      return false;
    return true;
  }
}
