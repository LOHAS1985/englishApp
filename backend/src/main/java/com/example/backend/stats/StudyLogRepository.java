package com.example.backend.stats;

import com.example.backend.common.TableSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface StudyLogRepository extends JpaRepository<StudyLog, Long> {
  List<StudyLog> findByUserIdAndCreatedAtGreaterThanEqual(Long userId, LocalDateTime from);

  List<StudyLog> findTop50ByUserIdOrderByIdDesc(Long userId);

  /** レベル(経験値)の計算用。全期間を古い順に */
  List<StudyLog> findByUserIdOrderByIdAsc(Long userId);

  /** 記録が増えたかの判定用(レベルのキャッシュ) */
  @Query("select count(l) as count, coalesce(max(l.id), 0) as maxId from StudyLog l where l.userId = :userId")
  TableSignature signature(@Param("userId") Long userId);
}
