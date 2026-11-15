package com.example.backend.speaking.dto;

/**
 * 採点リクエスト。問題の内容はサーバー側の問題集から setId で引く。
 *
 * @param part            1 = ナレーション、2〜4 = Q&A の質問番号
 * @param transcript      話した内容の文字起こし(ブラウザの音声認識。利用者が直したものを含む)
 * @param speakingSeconds 録音した秒数(速さの目安に使う)。分からなければ null
 */
public record SpeakingScoreRequest(String setId, int part, String transcript, Integer speakingSeconds) {
}
