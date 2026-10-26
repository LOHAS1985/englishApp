package com.example.backend.grammar;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PendingGrammarQuestionRepository extends JpaRepository<PendingGrammarQuestion, String> {

  Optional<PendingGrammarQuestion> findFirstByServedFalseOrderByCreatedAtAsc();

  long countByServedFalse();

  /** 出題したまま回答されなかった問題を削除する(ストックは残す) */
  @Modifying
  @Transactional
  @Query("delete from PendingGrammarQuestion q where q.served = true and q.createdAt < :threshold")
  int deleteServedOlderThan(LocalDateTime threshold);
}
