package com.example.backend.reading;

import com.example.backend.reading.dto.ArticleDetail;
import com.example.backend.reading.dto.ArticleSummary;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reading")
public class ReadingController {

  private final GuardianService guardianService;
  private final ReadingAssistService readingAssistService;

  public ReadingController(GuardianService guardianService, ReadingAssistService readingAssistService) {
    this.guardianService = guardianService;
    this.readingAssistService = readingAssistService;
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
}