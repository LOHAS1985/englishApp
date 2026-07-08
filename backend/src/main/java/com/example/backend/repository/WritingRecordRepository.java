package com.example.backend.repository;

import com.example.backend.entity.WritingRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WritingRecordRepository extends JpaRepository<WritingRecord, Long> {
  List<WritingRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}