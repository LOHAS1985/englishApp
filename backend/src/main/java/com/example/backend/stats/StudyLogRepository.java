package com.example.backend.stats;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StudyLogRepository extends JpaRepository<StudyLog, Long> {
  List<StudyLog> findByUserIdAndCreatedAtGreaterThanEqual(Long userId, LocalDateTime from);

  List<StudyLog> findTop50ByUserIdOrderByIdDesc(Long userId);

  /** レベル(経験値)の計算用。全期間を古い順に */
  List<StudyLog> findByUserIdOrderByIdAsc(Long userId);
}
