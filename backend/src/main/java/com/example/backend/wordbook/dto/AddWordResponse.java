package com.example.backend.wordbook.dto;

/** added=false のときは同じ語が単語帳にすでにあり、その語を返す */
public record AddWordResponse(boolean added, WordView word) {
}
