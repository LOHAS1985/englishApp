package com.example.backend.dto;

import java.util.List;

public record GrammarQuestion(String id, String sentence, List<GrammarChoice> choices) {
}