package com.example.backend.writing;

import com.example.backend.common.QuestionSelector;
import com.example.backend.config.CurrentUserProvider;
import com.example.backend.writing.WritingPromptBank.WritingPrompt;
import com.example.backend.writing.dto.ScoreRequest;
import com.example.backend.writing.dto.ScoreResult;
import com.example.backend.writing.dto.WritingQuestion;
import org.springframework.stereotype.Service;

import java.util.List;

/** 英検準1級ライティング。お題は問題集から出し、採点だけを Gemini で行う(答案が毎回異なるため) */
@Service
public class GeminiService {

  private final GeminiApiClient geminiApiClient;
  private final WritingRecordRepository writingRecordRepository;
  private final CurrentUserProvider currentUserProvider;
  private final QuestionSelector questionSelector;
  private final WritingPromptBank promptBank;

  public GeminiService(GeminiApiClient geminiApiClient,
      WritingRecordRepository writingRecordRepository,
      CurrentUserProvider currentUserProvider,
      WritingPromptBank promptBank,
      QuestionSelector questionSelector) {
    this.questionSelector = questionSelector;
    this.geminiApiClient = geminiApiClient;
    this.writingRecordRepository = writingRecordRepository;
    this.currentUserProvider = currentUserProvider;
    this.promptBank = promptBank;
  }

  public WritingQuestion generateWritingQuestion(String type, String exclude) {
    String id = questionSelector.pick("writing", promptBank.ids(type), exclude);
    WritingPrompt p = promptBank.findById(id).orElseThrow();
    return new WritingQuestion(p.id(), p.type(), p.instruction(), p.topic(),
        p.points() == null ? List.of() : p.points(), p.passage(), p.minWords(), p.maxWords());
  }

  public ScoreResult scoreAnswer(ScoreRequest request) {
    WritingPrompt p = promptBank.findById(request.questionId())
        .orElseThrow(() -> new IllegalArgumentException("お題が見つかりません。再度出題してください。"));
    if (request.answer() == null || request.answer().isBlank()) {
      throw new IllegalArgumentException("解答を入力してください");
    }

    String prompt = p.isSummary() ? summaryScoringPrompt(p, request.answer()) : opinionScoringPrompt(p, request.answer());
    ScoreResult result = geminiApiClient.generate(prompt, ScoreResult.class);

    int total = result.getContent().getScore()
        + result.getStructure().getScore()
        + result.getVocabulary().getScore()
        + result.getGrammar().getScore();
    result.setTotal(total);

    saveRecord(p, request.answer(), result);

    return result;
  }

  private String opinionScoringPrompt(WritingPrompt p, String answer) {
    return """
        You are a strict but fair examiner for the Eiken Pre-1 writing test (opinion essay).

        Evaluate the following essay on 4 criteria, each scored 0-4 points (integer only).

        Criteria:
        1. content - Does it include a clear opinion and well-developed reasons that answer the task, using TWO of the given POINTS?
        2. structure - Is the essay logically organized with a clear flow (introduction, body, conclusion) and good use of linking words?
        3. vocabulary - Is the vocabulary appropriate for the task, varied, and used correctly without excessive repetition?
        4. grammar - Is there a good variety of sentence structures used correctly?

        The suggested length is 120-150 words. Deduct from content if the essay is far outside this range.
        %s

        TOPIC: %s

        POINTS: %s

        ESSAY:
        %s

        %s
        """.formatted(FEEDBACK_RULES, p.topic(), String.join(", ", p.points()), answer, RESULT_FORMAT);
  }

  private String summaryScoringPrompt(WritingPrompt p, String answer) {
    return """
        You are a strict but fair examiner for the Eiken Pre-1 writing test (summary task).

        The candidate read the article below and wrote a summary in English.
        Evaluate the summary on 4 criteria, each scored 0-4 points (integer only).

        Criteria:
        1. content - Does it accurately cover the main points of the article without adding the writer's own opinions or minor details?
        2. structure - Is the summary coherent and logically ordered, with appropriate linking words?
        3. vocabulary - Does it paraphrase the article in the candidate's own words rather than copying phrases, with accurate word choice?
        4. grammar - Are sentence structures varied and correct?

        The suggested length is 60-70 words. Deduct from content if the summary is far outside this range.
        Deduct from vocabulary if long phrases are copied directly from the article.
        %s

        ARTICLE TITLE: %s

        ARTICLE:
        %s

        SUMMARY:
        %s

        %s
        """.formatted(FEEDBACK_RULES, p.topic(), p.passage(), answer, RESULT_FORMAT);
  }

  private static final String FEEDBACK_RULES = """

      For each criterion, give a score (0-4) and feedback in Japanese.

      The feedback MUST include concrete references to the actual answer text, not general advice. Specifically:
      - Quote the exact word, phrase, or sentence from the answer that has a problem (using quotation marks).
      - Explain concretely what is wrong with it (e.g. repetition, wrong word choice, unclear logic, grammatical error).
      - Suggest a specific alternative word, phrase, or sentence that would improve it.
      - If a criterion has no issues, mention one specific strength by quoting the relevant part of the answer instead of a generic compliment.
      - Keep each feedback to 2-4 sentences, but every sentence must reference specific content from the answer.
      """;

  private static final String RESULT_FORMAT = """
      Return the result as a JSON object with fields: content, structure, vocabulary, grammar,
      each an object with "score" (integer 0-4) and "feedback" (Japanese string).
      """;

  private void saveRecord(WritingPrompt p, String answer, ScoreResult result) {
    WritingRecord record = new WritingRecord();
    record.setUserId(currentUserProvider.getCurrentUserId());
    record.setTopic(p.topic());
    record.setPrompt(p.isSummary() ? "summary:" + p.id() : "opinion:" + p.id());
    record.setPoints(WritingRecord.joinPoints(p.points() == null ? List.of() : p.points()));
    record.setAnswer(answer);

    String trimmed = answer.trim();
    record.setWordCount(trimmed.isEmpty() ? 0 : trimmed.split("\\s+").length);

    record.setContentScore(result.getContent().getScore());
    record.setContentFeedback(result.getContent().getFeedback());
    record.setStructureScore(result.getStructure().getScore());
    record.setStructureFeedback(result.getStructure().getFeedback());
    record.setVocabularyScore(result.getVocabulary().getScore());
    record.setVocabularyFeedback(result.getVocabulary().getFeedback());
    record.setGrammarScore(result.getGrammar().getScore());
    record.setGrammarFeedback(result.getGrammar().getFeedback());
    record.setTotalScore(result.getTotal());

    writingRecordRepository.save(record);
  }
}
