package com.example.backend.common;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PracticeRecordRepository extends JpaRepository<PracticeRecord, Long> {
  List<PracticeRecord> findByUserIdAndFeatureOrderByIdDesc(Long userId, String feature);

  /** 指定した機能の記録が増えたかの判定用(弱点分析のキャッシュ) */
  @Query("select count(r) as count, coalesce(max(r.id), 0) as maxId from PracticeRecord r "
      + "where r.userId = :userId and r.feature in :features")
  TableSignature signature(@Param("userId") Long userId, @Param("features") Collection<String> features);
}
