package com.example.backend.reading;

import com.example.backend.reading.dto.ArticleDetail;
import com.example.backend.reading.dto.ArticleSummary;
import com.example.backend.reading.dto.ReadingHistoryItem;
import com.example.backend.reading.dto.ReadingRecordRequest;
import com.example.backend.reading.dto.ReadingRecordResult;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reading")
public class ReadingController {

  private final ReadingService readingService;

  public ReadingController(ReadingService readingService) {
    this.readingService = readingService;
  }

  @GetMapping("/articles")
  public List<ArticleSummary> getArticles(
      @RequestParam(required = false) String query,
      @RequestParam(defaultValue = "1") int page) {
    return readingService.searchArticles(query, page);
  }

  @GetMapping("/article")
  public ArticleDetail getArticle(@RequestParam String id) {
    return readingService.getArticle(id);
  }

  @PostMapping("/record")
  public ReadingRecordResult recordReading(@RequestBody ReadingRecordRequest request) {
    return readingService.record(request);
  }

  @GetMapping("/history")
  public List<ReadingHistoryItem> getHistory() {
    return readingService.history();
  }
}
