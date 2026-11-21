package com.example.backend.wordbook.dto;

/**
 * 英文の対象語を空欄にし、その日本語訳を添えた問題。答えは英単語を入力する。
 * hint は答えの頭文字と文字数(例: a________ (9文字))。同義語のどれも入りそうな空欄でも、答えが1つに決まるようにする
 */
public record FillQuestionView(Long wordId, String sentence, String translation, String hint) {
}
