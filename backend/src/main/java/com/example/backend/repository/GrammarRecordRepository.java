package com.example.backend.repository;

import com.example.backend.entity.GrammarRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GrammarRecordRepository extends JpaRepository<GrammarRecord, Long> {
  List<GrammarRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}