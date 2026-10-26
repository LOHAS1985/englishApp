package com.example.backend.accesslog;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

public interface AccessLogRepository extends JpaRepository<AccessLog, Long> {
  List<AccessLog> findByCreatedAtAfterOrderByCreatedAtDesc(LocalDateTime since);

  @Transactional
  long deleteByCreatedAtBefore(LocalDateTime before);
}
