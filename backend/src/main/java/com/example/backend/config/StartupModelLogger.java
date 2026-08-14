package com.example.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class StartupModelLogger {
  private static final Logger logger = LoggerFactory.getLogger(StartupModelLogger.class);
  private final Environment env;

  public StartupModelLogger(Environment env) {
    this.env = env;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void logModelOnStartup() {
    String model = env.getProperty("spring.ai.google.genai.chat.options.model");
    logger.info("Effective spring.ai.google.genai.chat.options.model='{}'", model);
    try {
      java.nio.file.Path out = java.nio.file.Path.of("target", "effective-model.txt");
      java.nio.file.Files.createDirectories(out.getParent());
      java.nio.file.Files.writeString(out,
          "spring.ai.google.genai.chat.options.model=" + (model == null ? "<null>" : model) + "\n",
          java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.TRUNCATE_EXISTING);
      logger.info("Wrote effective model to {}", out.toAbsolutePath());
    } catch (Exception e) {
      logger.warn("Failed to write effective model file", e);
    }
  }
}
