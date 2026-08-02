package com.example.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReadingRecordRepository extends JpaRepository<ReadingRecord, Long> {
    List<ReadingRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}