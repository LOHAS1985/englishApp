package com.example.backend.writing.dto;

/** 採点リクエスト。お題の内容はサーバー側の問題集から questionId で引く */
public record ScoreRequest(String questionId, String answer) {
}
