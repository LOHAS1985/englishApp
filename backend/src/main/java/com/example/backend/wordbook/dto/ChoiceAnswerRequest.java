package com.example.backend.wordbook.dto;

public record ChoiceAnswerRequest(Long wordId, String selectedMeaning, Integer durationSeconds) {
}
