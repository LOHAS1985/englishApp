package com.example.backend.review;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ReviewItemRepository extends JpaRepository<ReviewItem, Long> {
  Optional<ReviewItem> findByUserIdAndFeatureAndItemId(Long userId, String feature, String itemId);

  List<ReviewItem> findByUserIdAndFeatureAndDueDateLessThanEqualOrderByDueDateAscIdAsc(Long userId, String feature,
      LocalDate today);

  long countByUserIdAndFeature(Long userId, String feature);
}
