package com.example.backend.wordbook.dto;

/** exampleEn と exampleAnswer は読解から登録するときだけ送る(手動登録では省略する) */
public record AddWordRequest(String word, String exampleEn, String exampleAnswer) {
}
