package com.example.backend.listening;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ListeningRecordRepository extends JpaRepository<ListeningRecord, Long> {
  List<ListeningRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
}
