package com.example.backend.reading;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.reading.dto.ArticleDetail;
import com.example.backend.reading.dto.ArticleSummary;
import com.example.backend.reading.dto.ReadingHistoryItem;
import com.example.backend.reading.dto.ReadingRecordRequest;
import com.example.backend.reading.dto.ReadingRecordResult;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;

import java.util.List;

/** Guardian の記事を読む多読モード。記事に AI の要約・語彙を付け、読了時間から WPM を記録する */
@Service
public class ReadingService {

  private final GuardianApiClient guardianApiClient;
  private final ReadingAssistService readingAssistService;
  private final CurrentUserProvider currentUserProvider;
  private final ReadingRecordRepository readingRecordRepository;
  private final StudyLogService studyLogService;

  public ReadingService(GuardianApiClient guardianApiClient,
      ReadingAssistService readingAssistService,
      CurrentUserProvider currentUserProvider,
      ReadingRecordRepository readingRecordRepository,
      StudyLogService studyLogService) {
    this.guardianApiClient = guardianApiClient;
    this.readingAssistService = readingAssistService;
    this.currentUserProvider = currentUserProvider;
    this.readingRecordRepository = readingRecordRepository;
    this.studyLogService = studyLogService;
  }

  public List<ArticleSummary> searchArticles(String query, int page) {
    return guardianApiClient.searchArticles(query, page);
  }

  public ArticleDetail getArticle(String id) {
    ArticleDetail base = guardianApiClient.getArticle(id);
    String plainText = HtmlUtils.stripTags(base.body());

    ReadingAssistService.AssistResult assist = readingAssistService.generate(plainText);

    return new ArticleDetail(
        base.id(), base.title(), base.byline(), plainText, base.webUrl(),
        base.publishedDate(), assist.summary, assist.vocabulary);
  }

  public ReadingRecordResult record(ReadingRecordRequest request) {
    int wpm = request.getDurationSeconds() > 0
        ? (int) Math.round(request.getWordCount() / (request.getDurationSeconds() / 60.0))
        : 0;

    ReadingRecord record = new ReadingRecord();
    record.setUserId(currentUserProvider.getCurrentUserId());
    record.setArticleId(request.getArticleId());
    record.setArticleTitle(request.getArticleTitle());
    record.setWordCount(request.getWordCount());
    record.setDurationSeconds(request.getDurationSeconds());
    record.setWpm(wpm);
    readingRecordRepository.save(record);
    // 記事 ID は長いので学習ログには入れない(履歴は reading_records にある)
    studyLogService.log("reading", "guardian", null, null, null, request.getDurationSeconds());

    return new ReadingRecordResult(request.getWordCount(), request.getDurationSeconds(), wpm);
  }

  public List<ReadingHistoryItem> history() {
    return readingRecordRepository.findByUserIdOrderByCreatedAtDesc(currentUserProvider.getCurrentUserId())
        .stream()
        .map(ReadingHistoryItem::from)
        .toList();
  }
}
