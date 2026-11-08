package com.example.backend.mock;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MockExamRepository extends JpaRepository<MockExam, Long> {
  List<MockExam> findTop20ByUserIdOrderByIdDesc(Long userId);
}
