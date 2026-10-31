package com.example.backend.stats;

import com.example.backend.stats.dto.StatsSummary;
import com.example.backend.stats.dto.StudyLogItem;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 学習ログの集計(マイページ)と、全技能をまとめた最近の履歴 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

  private final StatsService statsService;

  public StatsController(StatsService statsService) {
    this.statsService = statsService;
  }

  @GetMapping("/summary")
  public StatsSummary summary() {
    return statsService.summary();
  }

  @GetMapping("/history")
  public List<StudyLogItem> history() {
    return statsService.recent();
  }
}
