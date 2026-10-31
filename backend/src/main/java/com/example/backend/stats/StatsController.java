package com.example.backend.stats;

import com.example.backend.stats.dto.StatsSummary;
import com.example.backend.stats.dto.StudyLogItem;
import com.example.backend.stats.dto.WeaknessItem;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 学習ログの集計(マイページ)と、全技能をまとめた最近の履歴 */
@RestController
@RequestMapping("/api/stats")
public class StatsController {

  private final StatsService statsService;
  private final WeaknessService weaknessService;

  public StatsController(StatsService statsService, WeaknessService weaknessService) {
    this.statsService = statsService;
    this.weaknessService = weaknessService;
  }

  @GetMapping("/summary")
  public StatsSummary summary() {
    return statsService.summary();
  }

  @GetMapping("/history")
  public List<StudyLogItem> history() {
    return statsService.recent();
  }

  /** 文法の分野・語彙の品詞・読解/リスニングの設問タイプ別の成績(全期間) */
  @GetMapping("/weakness")
  public List<WeaknessItem> weakness() {
    return weaknessService.summary();
  }
}
