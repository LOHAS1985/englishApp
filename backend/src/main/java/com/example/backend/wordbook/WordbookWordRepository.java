package com.example.backend.wordbook;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WordbookWordRepository extends JpaRepository<WordbookWord, Long> {
  List<WordbookWord> findByUserIdOrderByIdAsc(Long userId);
}
