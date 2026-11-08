package com.example.backend.mock;

import com.example.backend.common.ChoiceQuestionBank.ChoiceQuestion;
import com.example.backend.common.QuestionSetBank;
import com.example.backend.common.QuestionSetBank.QuestionSet;
import com.example.backend.common.QuestionSetPractice;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarQuestionBank;
import com.example.backend.grammar.GrammarService;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.listening.ListeningQuestionBank;
import com.example.backend.mock.dto.MockExamView;
import com.example.backend.mock.dto.MockExamView.Item;
import com.example.backend.mock.dto.MockExamView.Question;
import com.example.backend.mock.dto.MockExamView.Section;
import com.example.backend.mock.dto.MockHistoryItem;
import com.example.backend.mock.dto.MockResult;
import com.example.backend.mock.dto.MockSubmit;
import com.example.backend.reading.ReadingQuestionBank;
import com.example.backend.stats.StudyLogService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ThreadLocalRandom;

/**
 * TOEIC L&R の模試。本番と同じ区切り・制限時間で通して解き、採点して推定点を出す。
 * 出題の区切りは次の通り(Part 1 は画像が無いので省く):
 * リスニング 45 分(Part 2・3・4 の計94問)、リーディング 75 分(Part 5・6・7 の計100問)。
 * 解答は区切りごとに送られ、採点・記録・学習ログはここで行う。
 */
@Service
public class MockExamService {

  static final String TYPE = "toeic-mock";
  static final String EXAM = "toeic";
  static final int LISTENING_MINUTES = 45;
  static final int READING_MINUTES = 75;
  /** Part 5 は1問ずつの問題集から選ぶ */
  static final int PART5_QUESTIONS = 30;
  static final String PART5 = "toeic-part5";
  /** 区切りの秒数の上限(これより長い値は送られても切り詰める) */
  static final int MAX_SECTION_SECONDS = 2 * 60 * 60;

  /** 形式ごとの出題数 */
  record Part(String type, int questions) {
  }

  static final List<Part> LISTENING_PARTS = List.of(
      new Part("toeic-part2", 25), new Part("toeic-part3", 39), new Part("toeic-part4", 30));
  static final List<Part> READING_PARTS = List.of(new Part("toeic-part6", 16), new Part("toeic-part7", 54));

  private final ListeningQuestionBank listeningBank;
  private final ReadingQuestionBank readingBank;
  private final GrammarQuestionBank grammarBank;
  private final QuestionSetPractice practice;
  private final GrammarService grammarService;
  private final StudyLogService studyLogService;
  private final CurrentUserProvider currentUserProvider;
  private final MockExamRepository repository;

  public MockExamService(ListeningQuestionBank listeningBank, ReadingQuestionBank readingBank,
      GrammarQuestionBank grammarBank, QuestionSetPractice practice, GrammarService grammarService,
      StudyLogService studyLogService, CurrentUserProvider currentUserProvider, MockExamRepository repository) {
    this.listeningBank = listeningBank;
    this.readingBank = readingBank;
    this.grammarBank = grammarBank;
    this.practice = practice;
    this.grammarService = grammarService;
    this.studyLogService = studyLogService;
    this.currentUserProvider = currentUserProvider;
    this.repository = repository;
  }

  /** 新しい模試の問題一式を作る(毎回組み直す) */
  public MockExamView start() {
    return generate(ThreadLocalRandom.current());
  }

  MockExamView generate(Random random) {
    List<Item> listening = new ArrayList<>();
    for (Part part : LISTENING_PARTS) {
      for (QuestionSet set : MockSelection.chooseToTotal(setsOf(listeningBank, part.type()), part.questions(),
          s -> s.questions().size(), random)) {
        listening.add(setItem("listening", set));
      }
    }

    List<Item> reading = new ArrayList<>();
    List<String> part5Ids = new ArrayList<>(grammarBank.ids());
    Collections.shuffle(part5Ids, random);
    for (String id : part5Ids.subList(0, Math.min(PART5_QUESTIONS, part5Ids.size()))) {
      grammarBank.findById(id).ifPresent(q -> reading.add(grammarItem(q)));
    }
    for (Part part : READING_PARTS) {
      for (QuestionSet set : MockSelection.chooseToTotal(setsOf(readingBank, part.type()), part.questions(),
          s -> s.questions().size(), random)) {
        reading.add(setItem("reading", set));
      }
    }

    return new MockExamView(List.of(
        new Section("listening", LISTENING_MINUTES, listening),
        new Section("reading", READING_MINUTES, reading)));
  }

  /**
   * 区切りごとの解答を採点し、記録・学習ログ・模試の結果を保存する。
   * 問題集から消えた問題は数えない。解答されていない設問は不正解として数える。
   */
  public MockResult submit(MockSubmit request) {
    // 区切りごとの集計: 0 = 正解数, 1 = 設問数, 2 = 秒数
    Map<String, int[]> skills = new LinkedHashMap<>();
    skills.put("listening", new int[3]);
    skills.put("reading", new int[3]);
    // 形式ごとの集計: 0 = 正解数, 1 = 設問数
    Map<String, int[]> parts = new LinkedHashMap<>();

    for (MockSubmit.Section section : request.sections()) {
      int[] skill = skills.get(section.skill());
      if (skill == null) {
        continue;
      }
      skill[2] += clampSeconds(section.durationSeconds());
      for (MockSubmit.Answer item : section.items()) {
        gradeItem(item, skills, parts);
      }
    }

    int[] listening = skills.get("listening");
    int[] reading = skills.get("reading");
    int listeningScore = ToeicEstimate.scaled(listening[0], listening[1]);
    int readingScore = ToeicEstimate.scaled(reading[0], reading[1]);
    Long userId = currentUserProvider.getCurrentUserId();
    MockExam saved = repository.save(new MockExam(userId, EXAM, listening[0], listening[1], reading[0], reading[1],
        listeningScore, readingScore, listening[2], reading[2], LocalDateTime.now(StudyLogService.JST)));

    // 区切りは1行の学習ログにする(設問ごとに書くと、模試の時間が解答の回数に分かれてしまうため)
    String itemId = "mock-" + saved.getId();
    if (listening[1] > 0) {
      studyLogService.logSession("listening", TYPE, itemId, listening[0], listening[1], listening[2]);
    }
    if (reading[1] > 0) {
      studyLogService.logSession("reading", TYPE, itemId, reading[0], reading[1], reading[2]);
    }

    List<MockResult.Part> partResults = parts.entrySet().stream()
        .map(e -> new MockResult.Part(e.getKey(), e.getValue()[0], e.getValue()[1]))
        .toList();
    return new MockResult(
        saved.getId(),
        new MockResult.Section("listening", listening[0], listening[1], listeningScore,
            ToeicEstimate.TARGET_LISTENING, listening[2]),
        new MockResult.Section("reading", reading[0], reading[1], readingScore,
            ToeicEstimate.TARGET_READING, reading[2]),
        listeningScore + readingScore,
        ToeicEstimate.TARGET_TOTAL,
        partResults);
  }

  /** 過去の模試の結果(新しい順) */
  public List<MockHistoryItem> history() {
    return repository.findTop20ByUserIdOrderByIdDesc(currentUserProvider.getCurrentUserId()).stream()
        .map(MockHistoryItem::from)
        .toList();
  }

  /** 1つの文章・音声(または Part 5 の1問)を採点する。区切りは問題の種類(音声か読解か)で決める */
  private void gradeItem(MockSubmit.Answer item, Map<String, int[]> skills, Map<String, int[]> parts) {
    boolean grammar = "grammar".equals(item.feature());
    int[] skill = skills.get("listening".equals(item.feature()) ? "listening" : "reading");
    if (grammar) {
      grammarBank.findById(item.id()).ifPresent(q -> {
        String first = item.answers() == null || item.answers().isEmpty() ? "" : item.answers().get(0);
        boolean correct = grammarService.saveRecord(q, first == null ? "" : first.trim().toUpperCase());
        add(skill, parts, PART5, correct ? 1 : 0, 1);
      });
      return;
    }
    QuestionSetBank bank = "listening".equals(item.feature()) ? listeningBank : readingBank;
    bank.findById(item.id()).ifPresent(set -> {
      List<QuestionSetPractice.SetQuestionResult> results = practice.scoreAndRecord(item.feature(), set,
          item.answers());
      int correct = (int) results.stream().filter(QuestionSetPractice.SetQuestionResult::correct).count();
      add(skill, parts, set.type(), correct, set.questions().size());
    });
  }

  private static void add(int[] skill, Map<String, int[]> parts, String type, int correct, int total) {
    skill[0] += correct;
    skill[1] += total;
    int[] part = parts.computeIfAbsent(type, k -> new int[2]);
    part[0] += correct;
    part[1] += total;
  }

  static int clampSeconds(Integer seconds) {
    return seconds == null ? 0 : Math.min(Math.max(seconds, 0), MAX_SECTION_SECONDS);
  }

  private static List<QuestionSet> setsOf(QuestionSetBank bank, String type) {
    return bank.all().stream().filter(s -> s.type().equals(type)).toList();
  }

  /**
   * セット問題を画面用の形にする。音声だけの形式は文字を渡さず、リスニングは題名も出さない
   * (練習画面と同じ。内容が分かってしまうため)。
   */
  private static Item setItem(String feature, QuestionSet set) {
    boolean audioOnly = QuestionSetPractice.isAudioOnly(set.type());
    List<Question> questions = set.questions().stream()
        .map(q -> audioOnly
            ? new Question("", q.choices().stream().map(c -> "").toList())
            : new Question(q.question(), q.choices()))
        .toList();
    boolean listening = "listening".equals(feature);
    return new Item(feature, set.id(), set.type(), listening ? null : set.title(),
        listening ? null : set.passage(), set.situation(), set.graphic(), questions);
  }

  private static Item grammarItem(ChoiceQuestion q) {
    List<String> texts = q.choices().stream().map(GrammarChoice::text).toList();
    return new Item("grammar", q.id(), PART5, null, q.sentence(), null, null, List.of(new Question("", texts)));
  }
}
