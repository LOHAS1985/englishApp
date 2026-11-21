package com.example.backend.wordbook.dto;

/** 例文の修正。exampleAnswer は例文の中で空欄にする語(変化形のこともある)、exampleJa が空なら翌日の調査で取り直す */
public record ExampleRequest(String exampleEn, String exampleAnswer, String exampleJa) {
}
