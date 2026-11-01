package com.example.backend.level;

import com.example.backend.level.dto.LevelSummary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** レベル(経験値)と、期限(2027年3月末に Lv.100)までの学習ペース */
@RestController
@RequestMapping("/api/level")
public class LevelController {

  private final LevelService levelService;

  public LevelController(LevelService levelService) {
    this.levelService = levelService;
  }

  @GetMapping
  public LevelSummary summary() {
    return levelService.summary();
  }
}
