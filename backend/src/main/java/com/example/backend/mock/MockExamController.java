package com.example.backend.mock;

import com.example.backend.mock.dto.MockExamView;
import com.example.backend.mock.dto.MockHistoryItem;
import com.example.backend.mock.dto.MockResult;
import com.example.backend.mock.dto.MockSubmit;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** TOEIC 模試(本番と同じ区切り・制限時間で通して解く)。問題は問題集から毎回組み直す */
@RestController
@RequestMapping("/api/mock")
public class MockExamController {

  private final MockExamService service;

  public MockExamController(MockExamService service) {
    this.service = service;
  }

  @PostMapping("/start")
  public MockExamView start() {
    return service.start();
  }

  @PostMapping("/submit")
  public MockResult submit(@RequestBody MockSubmit request) {
    return service.submit(request);
  }

  @GetMapping("/history")
  public List<MockHistoryItem> history() {
    return service.history();
  }
}
