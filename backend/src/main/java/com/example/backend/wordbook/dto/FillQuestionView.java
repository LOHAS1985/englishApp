package com.example.backend.wordbook.dto;

/** 英文の対象語を空欄にし、その日本語訳を添えた問題。答えは英単語を入力する */
public record FillQuestionView(Long wordId, String sentence, String translation) {
}
