package com.example.backend.reading;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReadingSpeedRepository extends JpaRepository<ReadingSpeed, Long> {
  List<ReadingSpeed> findTop50ByUserIdOrderByIdDesc(Long userId);
}
