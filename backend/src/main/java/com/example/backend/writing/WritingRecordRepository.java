package com.example.backend.writing;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WritingRecordRepository extends JpaRepository<WritingRecord, Long> {
  List<WritingRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}