package com.example.backend.controller;

import com.example.backend.dto.ArticleDetail;
import com.example.backend.dto.ArticleSummary;
import com.example.backend.service.GuardianService;
import com.example.backend.service.HtmlUtils;
import com.example.backend.service.ReadingAssistService;
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

  @GetMapping("/articles/{articleId}")
  public ArticleDetail getArticle(@PathVariable String articleId) {
    ArticleDetail base = guardianService.getArticle(articleId);
    String plainText = HtmlUtils.stripTags(base.body());

    ReadingAssistService.AssistResult assist = readingAssistService.generate(plainText);

    return new ArticleDetail(
        base.id(), base.title(), base.byline(), plainText, base.webUrl(),
        base.publishedDate(), assist.summary, assist.vocabulary);
  }
}