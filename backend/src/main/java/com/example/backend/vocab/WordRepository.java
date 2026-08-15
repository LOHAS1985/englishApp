package com.example.backend.vocab;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WordRepository extends JpaRepository<Word, Long> {
  boolean existsByWord(String word);
}
