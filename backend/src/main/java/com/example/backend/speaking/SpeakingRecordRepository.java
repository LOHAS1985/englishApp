package com.example.backend.speaking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpeakingRecordRepository extends JpaRepository<SpeakingRecord, Long> {

  List<SpeakingRecord> findTop30ByUserIdOrderByCreatedAtDescIdDesc(Long userId);
}
