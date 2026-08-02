package com.example.backend.reading;

import com.example.backend.reading.dto.ArticleDetail;
import com.example.backend.reading.dto.ArticleSummary;
import org.springframework.web.bind.annotation.*;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.reading.dto.ReadingHistoryItem;
import com.example.backend.reading.dto.ReadingRecordRequest;
import com.example.backend.reading.dto.ReadingRecordResult;
import com.example.backend.user.User;
import java.util.List;

@RestController
@RequestMapping("/api/reading")
public class ReadingController {

  private final GuardianService guardianService;
  private final ReadingAssistService readingAssistService;
  private final CurrentUserProvider currentUserProvider;
  private final ReadingRecordRepository readingRecordRepository;

  public ReadingController(GuardianService guardianService,
      ReadingAssistService readingAssistService,
      CurrentUserProvider currentUserProvider,
      ReadingRecordRepository readingRecordRepository) {
    this.guardianService = guardianService;
    this.readingAssistService = readingAssistService;
    this.currentUserProvider = currentUserProvider;
    this.readingRecordRepository = readingRecordRepository;
  }

  @GetMapping("/articles")
  public List<ArticleSummary> getArticles(
      @RequestParam(required = false) String query,
      @RequestParam(defaultValue = "1") int page) {
    return guardianService.searchArticles(query, page);
  }

  @GetMapping("/article")
  public ArticleDetail getArticle(@RequestParam String id) {
    ArticleDetail base = guardianService.getArticle(id);
    String plainText = HtmlUtils.stripTags(base.body());

    ReadingAssistService.AssistResult assist = readingAssistService.generate(plainText);

    return new ArticleDetail(
        base.id(), base.title(), base.byline(), plainText, base.webUrl(),
        base.publishedDate(), assist.summary, assist.vocabulary);
  }

  @PostMapping("/record")
  public ReadingRecordResult recordReading(@RequestBody ReadingRecordRequest request) {
    User user = currentUserProvider.getCurrentUser();

    int wpm = request.getDurationSeconds() > 0
        ? (int) Math.round(request.getWordCount() / (request.getDurationSeconds() / 60.0))
        : 0;

    ReadingRecord record = new ReadingRecord();
    record.setUserId(user.getId());
    record.setArticleId(request.getArticleId());
    record.setArticleTitle(request.getArticleTitle());
    record.setWordCount(request.getWordCount());
    record.setDurationSeconds(request.getDurationSeconds());
    record.setWpm(wpm);
    readingRecordRepository.save(record);

    return new ReadingRecordResult(request.getWordCount(), request.getDurationSeconds(), wpm);
  }

  @GetMapping("/history")
  public List<ReadingHistoryItem> getHistory() {
    User user = currentUserProvider.getCurrentUser();
    return readingRecordRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
        .stream()
        .map(ReadingHistoryItem::from)
        .toList();
  }
}