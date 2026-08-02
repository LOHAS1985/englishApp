package com.example.backend.reading.dto;

public record ReadingRecordResult(
    int wordCount,
    int durationSeconds,
    int wpm
) {}