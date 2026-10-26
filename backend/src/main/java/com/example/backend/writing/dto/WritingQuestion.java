package com.example.backend.writing.dto;

import java.util.List;

/**
 * 画面に渡すお題。
 * prompt は指示文、passage は要約問題の本文(意見論述では null)、points は意見論述の観点(要約では空)
 */
public record WritingQuestion(
    String id,
    String type,
    String prompt,
    String topic,
    List<String> points,
    String passage,
    int minWords,
    int maxWords) {
}
