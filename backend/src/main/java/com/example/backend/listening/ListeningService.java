package com.example.backend.listening;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.listening.dto.GeneratedDialog;
import com.example.backend.listening.dto.GeneratedQuestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** リスニング問題の出題(DB保存)と採点・記録を行う */
@Service
public class ListeningService {

  private static final Logger logger = LoggerFactory.getLogger(ListeningService.class);
  private static final int CHOICES_PER_QUESTION = 3;
  private static final int QUESTIONS_PER_DIALOG = 3;

  private final ListeningGeminiService listeningGeminiService;
  private final ListeningQuestionRepository questionRepository;
  private final ListeningRecordRepository recordRepository;
  private final CurrentUserProvider currentUserProvider;

  public ListeningService(ListeningGeminiService listeningGeminiService,
      ListeningQuestionRepository questionRepository,
      ListeningRecordRepository recordRepository,
      CurrentUserProvider currentUserProvider) {
    this.listeningGeminiService = listeningGeminiService;
    this.questionRepository = questionRepository;
    this.recordRepository = recordRepository;
    this.currentUserProvider = currentUserProvider;
  }

  public record ExerciseBatch(List<ListeningExercise> exercises, boolean fallback) {
  }

  public ExerciseBatch createExercises(int dialogCount) {
    List<GeneratedDialog> generated = listeningGeminiService.generateDialogs(dialogCount);
    boolean fallback = listeningGeminiService.wasLastCallFallback();

    List<GeneratedDialog> valid = generated.stream().filter(this::isValidGeneratedDialog).toList();
    if (valid.size() < generated.size()) {
      logger.info("createExercises: filtered out {} invalid generated dialogs", generated.size() - valid.size());
    }

    List<ListeningExercise> out = new ArrayList<>();
    for (int i = 0; i < Math.min(dialogCount, valid.size()); i++) {
      GeneratedDialog g = valid.get(i);
      GeneratedQuestion[] questions = g.getQuestions();
      for (int q = 0; q < Math.min(QUESTIONS_PER_DIALOG, questions.length); q++) {
        List<String> choices = normalizeChoices(questions[q].getChoices());

        ListeningQuestion saved = new ListeningQuestion();
        saved.setDialogText(g.getDialog());
        saved.setQuestion(questions[q].getQuestion());
        saved.setChoiceList(choices);
        saved.setCorrectChoice(resolveCorrectLetter(questions[q].getCorrect(), choices));
        questionRepository.save(saved);

        out.add(new ListeningExercise(saved.getId(), "AI Generated: " + (i + 1), null, g.getDialog(),
            saved.getQuestion(), choices.toArray(new String[0])));
      }
    }
    return new ExerciseBatch(out, fallback);
  }

  public Map<String, Object> submit(Long questionId, String answer) {
    ListeningQuestion question = questionRepository.findById(questionId)
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません。再度出題してください。"));

    String selected = answer == null ? "" : answer.trim().toUpperCase();
    boolean ok = question.getCorrectChoice().equalsIgnoreCase(selected);

    // 未回答("")は記録しない。選択肢記号1文字のみ保存する
    if (selected.length() == 1) {
      ListeningRecord record = new ListeningRecord();
      record.setUserId(currentUserProvider.getCurrentUser().getId());
      record.setQuestionId(questionId);
      record.setSelectedChoice(selected);
      record.setCorrect(ok);
      recordRepository.save(record);
    }

    return Map.of("score", ok ? 1 : 0, "correct", ok, "correctAnswer", question.getCorrectChoice());
  }

  private List<String> normalizeChoices(String[] raw) {
    List<String> choices = new ArrayList<>();
    if (raw != null) {
      for (int j = 0; j < Math.min(CHOICES_PER_QUESTION, raw.length); j++)
        choices.add(raw[j]);
    }
    while (choices.size() < CHOICES_PER_QUESTION)
      choices.add("---");
    return choices;
  }

  // Gemini の correct は 'A'/'B'/'C' か選択肢の全文のどちらかで返ってくる
  private String resolveCorrectLetter(String correct, List<String> choices) {
    int correctIdx = 0;
    if (correct != null) {
      String c = correct.trim();
      if (c.length() == 1 && "ABC".contains(c.toUpperCase())) {
        correctIdx = c.toUpperCase().charAt(0) - 'A';
      } else {
        int found = choices.indexOf(c);
        if (found >= 0)
          correctIdx = found;
      }
    }
    return String.valueOf((char) ('A' + correctIdx));
  }

  // Validate generated dialog: reject dialogs or choices containing underscored
  // blanks or words like 'blank' or 'underscore'
  private boolean isValidGeneratedDialog(GeneratedDialog g) {
    if (g == null)
      return false;
    String dialog = g.getDialog();
    GeneratedQuestion[] questions = g.getQuestions();
    if (dialog == null || questions == null || questions.length == 0)
      return false;

    StringBuilder sb = new StringBuilder(dialog);
    for (GeneratedQuestion qq : questions) {
      if (qq == null || qq.getQuestion() == null || qq.getChoices() == null)
        return false;
      sb.append(" ").append(qq.getQuestion());
      for (String s : qq.getChoices())
        sb.append(" ").append(s);
    }
    String combined = sb.toString().toLowerCase();
    return !(combined.contains("_") || combined.contains("underscore") || combined.contains("blank"));
  }
}
