package com.example.backend.writing;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WritingRecordRepository extends JpaRepository<WritingRecord, Long> {
  List<WritingRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

  /** 履歴の画面用。答案・フィードバックを含むので、直近の件数だけ読む */
  List<WritingRecord> findTop200ByUserIdOrderByCreatedAtDesc(Long userId);

  List<WritingRecord> findByUserIdOrderByIdDesc(Long userId);
}