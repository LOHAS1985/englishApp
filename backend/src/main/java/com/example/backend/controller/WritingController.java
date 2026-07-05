package com.example.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.backend.service.GeminiService;
import com.example.backend.dto.WritingQuestion;

@RestController
@RequestMapping("/api/writing")
@CrossOrigin(origins = { "http://localhost:5173", "https://lohas1985.github.io" })
public class WritingController {

  private final GeminiService geminiService;

  public WritingController(GeminiService geminiService) {
    this.geminiService = geminiService;
  }

  @GetMapping("/question")
  public WritingQuestion getQuestion() {
    return geminiService.generateWritingQuestion();
  }
}