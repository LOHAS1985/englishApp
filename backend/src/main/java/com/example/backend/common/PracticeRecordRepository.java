package com.example.backend.common;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PracticeRecordRepository extends JpaRepository<PracticeRecord, Long> {
  List<PracticeRecord> findByUserIdAndFeatureOrderByIdDesc(Long userId, String feature);
}
