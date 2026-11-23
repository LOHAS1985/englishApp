package com.example.backend.grammar;

import com.example.backend.common.TableSignature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface GrammarRecordRepository extends JpaRepository<GrammarRecord, Long> {
  List<GrammarRecord> findByUserIdOrderByCreatedAtDesc(Long userId);

  /** 履歴の画面用。問題文・解説を含むので、件数を絞って読む */

  List<GrammarRecord> findByUserIdOrderByIdDesc(Long userId);

  /** 記録が増えたかの判定用(弱点分析のキャッシュ) */
  @Query("select count(r) as count, coalesce(max(r.id), 0) as maxId from GrammarRecord r where r.userId = :userId")
  TableSignature signature(@Param("userId") Long userId);
}
