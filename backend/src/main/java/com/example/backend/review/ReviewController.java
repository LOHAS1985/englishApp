package com.example.backend.review;

import com.example.backend.review.ReviewService.ReviewSummary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** 復習(間隔反復)の件数。出題は /api/vocab/question?review=true などの各機能の API で行う */
@RestController
@RequestMapping("/api/review")
public class ReviewController {

  private final ReviewService reviewService;

  public ReviewController(ReviewService reviewService) {
    this.reviewService = reviewService;
  }

  @GetMapping("/summary")
  public Map<String, ReviewSummary> summary() {
    return reviewService.summary();
  }
}
