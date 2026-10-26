package com.example.backend.grammar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface PendingGrammarQuestionRepository extends JpaRepository<PendingGrammarQuestion, String> {

  @Modifying
  @Transactional
  @Query("delete from PendingGrammarQuestion q where q.createdAt < :threshold")
  int deleteOlderThan(LocalDateTime threshold);
}
