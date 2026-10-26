package com.example.backend.grammar;

import com.example.backend.config.CurrentUserProvider;
import com.example.backend.grammar.GrammarQuestionBank.BankQuestion;
import com.example.backend.grammar.dto.GrammarAnswerRequest;
import com.example.backend.grammar.dto.GrammarAnswerResult;
import com.example.backend.grammar.dto.GrammarChoice;
import com.example.backend.grammar.dto.GrammarQuestion;
import org.springframework.stereotype.Service;

import java.util.List;

/** TOEIC Part 5 形式の文法問題を、リポジトリ内の問題集(GrammarQuestionBank)から出題・採点する */
@Service
public class GrammarService {

  private final GrammarQuestionBank questionBank;
  private final GrammarRecordRepository grammarRecordRepository;
  private final CurrentUserProvider currentUserProvider;

  public GrammarService(GrammarQuestionBank questionBank,
      GrammarRecordRepository grammarRecordRepository,
      CurrentUserProvider currentUserProvider) {
    this.questionBank = questionBank;
    this.grammarRecordRepository = grammarRecordRepository;
    this.currentUserProvider = currentUserProvider;
  }

  public GrammarQuestion generateQuestion() {
    BankQuestion q = questionBank.random();
    return new GrammarQuestion(q.id(), q.sentence(), q.choices());
  }

  public GrammarAnswerResult answer(GrammarAnswerRequest request) {
    BankQuestion q = questionBank.findById(request.getQuestionId())
        .orElseThrow(() -> new IllegalArgumentException("問題が見つかりません。再度出題してください。"));

    boolean isCorrect = q.answer().equalsIgnoreCase(request.getSelectedChoice());

    GrammarRecord record = new GrammarRecord();
    record.setUserId(currentUserProvider.getCurrentUser().getId());
    record.setQuestionId(q.id());
    record.setSentence(q.sentence());
    record.setChoiceA(textFor(q.choices(), "A"));
    record.setChoiceB(textFor(q.choices(), "B"));
    record.setChoiceC(textFor(q.choices(), "C"));
    record.setChoiceD(textFor(q.choices(), "D"));
    record.setCorrectChoice(q.answer());
    record.setSelectedChoice(request.getSelectedChoice());
    record.setCorrect(isCorrect);
    record.setExplanation(q.explanation());
    record.setTranslation(q.translation());
    grammarRecordRepository.save(record);

    return new GrammarAnswerResult(isCorrect, q.answer(), q.explanation(), q.translation());
  }

  private String textFor(List<GrammarChoice> choices, String label) {
    return choices.stream()
        .filter(c -> c.label().equals(label))
        .findFirst()
        .map(GrammarChoice::text)
        .orElse("");
  }
}
