import {
  API_BASE,
  errorMessage,
  getJson,
  jsonBody,
  postJson,
  send,
} from "./http";

import {
  countSetTypes,
  gradeChoiceQuestion,
  gradeQuestionSet,
  localScript,
  pickChoiceQuestion,
  pickQuestionSet,
} from "./localQuestions";

export { DEVICE_REGISTRATION_REQUIRED_EVENT, hasDeviceToken, saveDeviceToken } from "./http";
export { flushOutbox, pendingCount } from "./outbox";

/** 画面に表示中の問題を exclude で渡し、次の問題(先読み)で同じ問題が選ばれないようにする */
const excludeParam = (exclude?: string | null) =>
  exclude ? `exclude=${encodeURIComponent(exclude)}` : "";

/** Render の無料枠はスリープするので、画面を開いた時点で起こしておく(失敗は無視) */
export function wakeUpServer() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

export type WritingType = "opinion" | "summary";

export interface WritingQuestion {
  id: string;
  type: WritingType;
  prompt: string;
  topic: string;
  points: string[];
  passage: string | null;
  minWords: number;
  maxWords: number;
  /** 話題(社会・政治、環境・エネルギーなど) */
  theme: string | null;
}

export async function fetchWritingQuestion(type: WritingType, exclude?: string | null) {
  return getJson<WritingQuestion>(
    `/api/writing/question?type=${type}&${excludeParam(exclude)}`,
    "お題の取得に失敗しました",
  );
}

export interface CriterionScore {
  score: number;
  feedback: string;
}

export interface ScoreResult {
  content: CriterionScore;
  structure: CriterionScore;
  vocabulary: CriterionScore;
  grammar: CriterionScore;
  total: number;
}

export async function scoreWritingAnswer(
  questionId: string,
  answer: string,
  durationSeconds?: number,
) {
  return postJson<ScoreResult>(
    "/api/writing/score",
    { questionId, answer, durationSeconds },
    "採点に失敗しました",
  );
}

export interface WritingHistoryItem {
  id: number;
  topic: string;
  points: string[];
  answer: string;
  wordCount: number;
  contentScore: number;
  contentFeedback: string;
  structureScore: number;
  structureFeedback: string;
  vocabularyScore: number;
  vocabularyFeedback: string;
  grammarScore: number;
  grammarFeedback: string;
  totalScore: number;
  createdAt: string;
}

export async function fetchWritingHistory() {
  return getJson<WritingHistoryItem[]>("/api/writing/history", "履歴の取得に失敗しました");
}

export interface GrammarChoice {
  label: string;
  text: string;
}

export interface GrammarQuestion {
  id: string;
  sentence: string;
  choices: GrammarChoice[];
  /** 1=基礎 / 2=標準 / 3=発展 / 4=難関 / 5=最難関 */
  difficulty: number;
}

/** level(1〜3)を省略すると、サーバーが直近の正答率に合わせて難易度を選ぶ */
const levelParam = (level?: number) => (level ? `&level=${level}` : "");

export interface GrammarAnswerResult {
  correct: boolean;
  correctChoice: string;
  explanation: string;
  translation: string;
}

/**
 * 通常の出題は画面に同梱した問題集から選ぶ(サーバーの起動を待たない)。
 * review: true のときだけ、復習日の管理(review_items)を持つサーバーに問い合わせる
 * (無ければエラー「今日の復習はすべて終わりました」)。
 */
async function fetchChoiceQuestion(
  feature: "grammar" | "vocab",
  exclude: string | null | undefined,
  review: boolean,
  level: number | undefined,
) {
  if (!review) return pickChoiceQuestion(feature, exclude, level);
  return getJson<GrammarQuestion>(
    `/api/${feature}/question?review=true&${excludeParam(exclude)}${levelParam(level)}`,
    "問題の取得に失敗しました",
  );
}

/** 画面で採点してすぐ結果を返し、記録は裏でサーバーに送る(問題集に無い問題だけサーバーで採点) */
async function submitChoiceAnswer(
  feature: "grammar" | "vocab",
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  const local = await gradeChoiceQuestion(feature, questionId, selectedChoice, durationSeconds);
  if (local) return local;
  return postJson<GrammarAnswerResult>(
    `/api/${feature}/answer`,
    { questionId, selectedChoice, durationSeconds },
    "採点に失敗しました",
  );
}

export async function fetchGrammarQuestion(exclude?: string | null, review = false, level?: number) {
  return fetchChoiceQuestion("grammar", exclude, review, level);
}

export async function submitGrammarAnswer(
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  return submitChoiceAnswer("grammar", questionId, selectedChoice, durationSeconds);
}

// 語彙問題(形は文法問題と同じ)
export async function fetchVocabQuestion(exclude?: string | null, review = false, level?: number) {
  return fetchChoiceQuestion("vocab", exclude, review, level);
}

export async function submitVocabAnswer(
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  return submitChoiceAnswer("vocab", questionId, selectedChoice, durationSeconds);
}

export interface GrammarHistoryItem {
  id: number;
  sentence: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctChoice: string;
  selectedChoice: string;
  correct: boolean;
  explanation: string;
  translation: string;
  createdAt: string;
}

export async function fetchGrammarHistory() {
  return getJson<GrammarHistoryItem[]>("/api/grammar/history", "履歴の取得に失敗しました");
}

export interface ArticleSummary {
  id: string;
  title: string;
  section: string;
  thumbnail: string | null;
  publishedDate: string;
}

export interface VocabularyItem {
  word: string;
  meaning: string;
  example: string;
}

export interface ArticleDetail {
  id: string;
  title: string;
  byline: string | null;
  body: string;
  webUrl: string;
  publishedDate: string;
  summary: string;
  vocabulary: VocabularyItem[];
}

export async function fetchArticles(query?: string, page = 1) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  params.set("page", String(page));
  return getJson<ArticleSummary[]>(`/api/reading/articles?${params}`, "記事の取得に失敗しました");
}

export async function fetchArticleDetail(id: string) {
  const params = new URLSearchParams({ id });
  return getJson<ArticleDetail>(`/api/reading/article?${params}`, "記事の取得に失敗しました");
}

export interface ReadingRecordResult {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
}

export async function recordReading(
  articleId: string,
  articleTitle: string,
  wordCount: number,
  durationSeconds: number,
) {
  return postJson<ReadingRecordResult>(
    "/api/reading/record",
    { articleId, articleTitle, wordCount, durationSeconds },
    "記録の保存に失敗しました",
  );
}

// セット問題(読解・リスニング):文章や音声1つに複数の設問が付く
export interface SetQuestionView {
  question: string;
  choices: string[];
}

export interface QuestionSetView {
  id: string;
  type: string;
  title: string;
  passage: string | null;
  situation: string | null;
  /** TOEIC Part 3/4 の図表問題で見る表・図。等幅フォントで表示する */
  graphic: string | null;
  questions: SetQuestionView[];
  /** 1=基礎 / 2=標準 / 3=発展 / 4=難関 / 5=最難関 */
  difficulty: number;
  /** 話題(英検の長文・説明文のみ) */
  theme: string | null;
}

export interface SetQuestionResult {
  correct: boolean;
  selected: string;
  answer: string;
  explanation: string;
}

export interface SetAnswerResult {
  score: number;
  total: number;
  results: SetQuestionResult[];
  script: string | null;
  translation: string | null;
}

type PracticeFeature = "reading" | "listening";

// セット問題も画面に同梱した問題集から出題・採点し、記録は裏でサーバーに送る
export async function fetchPracticeTypes(feature: PracticeFeature): Promise<Record<string, number>> {
  return countSetTypes(feature);
}

export async function fetchPracticeSet(
  feature: PracticeFeature,
  type: string,
  exclude?: string | null,
  level?: number,
): Promise<QuestionSetView> {
  return pickQuestionSet(feature, type, exclude, level);
}

export async function submitPracticeAnswers(
  feature: PracticeFeature,
  setId: string,
  answers: string[],
  durationSeconds?: number,
  readingSeconds?: number,
): Promise<SetAnswerResult> {
  const graded = await gradeQuestionSet(feature, setId, answers, durationSeconds, readingSeconds);
  if (feature !== "listening") return graded;
  // リスニングの台本と和訳は画面に同梱していないので、解答後にサーバーから取る(取れなくても採点結果は出す)
  const reveal = await fetchListeningReveal(setId).catch(() => null);
  return { ...graded, script: reveal?.script ?? null, translation: reveal?.translation ?? null };
}

/** サーバーで台本を音声化する。結果は1ファイル(audioUrl)か行ごと(audioUrls) */
export async function synthesizeListeningAudio(setId: string) {
  return getJson<{ audioUrl?: string; audioUrls?: string[] }>(
    `/api/listening/practice/${setId}/audio`,
    "音声の生成に失敗しました",
    { method: "POST" },
  );
}

/** 解答後に見せる台本と和訳(リスニングは問題集に同梱していない) */
export async function fetchListeningReveal(setId: string) {
  return getJson<{ script: string | null; translation: string | null }>(
    `/api/listening/practice/${setId}/reveal`,
    "台本の取得に失敗しました",
  );
}

/** ブラウザの読み上げ機能で再生するための台本(画面には表示しない)。音声は解答の前に聞くので、解答前にもサーバーから取る */
export async function fetchListeningScript(setId: string) {
  const script = await localScript(setId);
  if (script) return script;
  const body = await getJson<{ script: string }>(
    `/api/listening/practice/${setId}/script`,
    "台本の取得に失敗しました",
  );
  return body.script;
}

export function toAbsoluteApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(API_BASE ?? "").replace(/\/$/, "")}${encodeURI(path)}`;
}

/** 読解速度の1回分(本文を読み終えるまでの秒数と語数から、語/分を出す) */
export interface ReadingSpeedItem {
  itemType: string;
  words: number;
  readingSeconds: number;
  wpm: number;
  createdAt: string;
}

export async function fetchReadingSpeed() {
  return getJson<ReadingSpeedItem[]>("/api/reading/practice/speed", "読解速度の取得に失敗しました");
}

// TOEIC 模試(本番と同じ区切り・制限時間。採点はサーバーで行う)
export interface MockQuestion {
  question: string;
  choices: string[];
}

export interface MockItem {
  /** 解答を送るときの区分(listening / reading / grammar) */
  feature: "listening" | "reading" | "grammar";
  id: string;
  type: string;
  title: string | null;
  passage: string | null;
  situation: string | null;
  graphic: string | null;
  questions: MockQuestion[];
}

export interface MockSection {
  skill: "listening" | "reading";
  minutes: number;
  items: MockItem[];
}

export interface MockExamView {
  sections: MockSection[];
}

export interface MockSectionScore {
  skill: "listening" | "reading";
  correct: number;
  total: number;
  /** 推定点(参考値。換算は仮のもの) */
  estimated: number;
  target: number;
  seconds: number;
}

export interface MockPartScore {
  type: string;
  correct: number;
  total: number;
}

export interface MockResult {
  id: number;
  listening: MockSectionScore;
  reading: MockSectionScore;
  estimatedTotal: number;
  targetTotal: number;
  parts: MockPartScore[];
}

export interface MockSubmitItem {
  feature: MockItem["feature"];
  id: string;
  answers: string[];
}

export interface MockSubmitSection {
  skill: MockSection["skill"];
  durationSeconds: number;
  items: MockSubmitItem[];
}

export interface MockHistoryItem {
  id: number;
  listeningCorrect: number;
  listeningTotal: number;
  readingCorrect: number;
  readingTotal: number;
  listeningScore: number;
  readingScore: number;
  estimatedTotal: number;
  createdAt: string;
}

export async function startMockExam() {
  return postJson<MockExamView>("/api/mock/start", {}, "模試の問題を用意できませんでした");
}

export async function submitMockExam(sections: MockSubmitSection[]) {
  return postJson<MockResult>("/api/mock/submit", { sections }, "模試の採点に失敗しました");
}

export async function fetchMockHistory() {
  return getJson<MockHistoryItem[]>("/api/mock/history", "模試の履歴の取得に失敗しました");
}

// スピーキング(英検二次の面接形式)
export interface InterviewQuestion {
  no: number;
  question: string;
  sampleAnswer: string;
}

export interface SpeakingSet {
  id: string;
  title: string;
  instruction: string;
  firstSentence: string;
  scenes: string[];
  narrationSample: string;
  questions: InterviewQuestion[];
}

export async function fetchSpeakingSet(exclude?: string | null) {
  return getJson<SpeakingSet>(
    `/api/speaking/question?${excludeParam(exclude)}`,
    "問題の取得に失敗しました",
  );
}

/** 1セット取り組んだ(模範解答を見た)ことを学習ログに残す */
export async function completeSpeakingSet(setId: string, durationSeconds: number) {
  await send("/api/speaking/complete", "記録の保存に失敗しました", jsonBody("POST", { setId, durationSeconds }));
}

// 学習ログの集計と復習(間隔反復)
export type Skill = "listening" | "reading" | "writing" | "speaking" | "vocab";

export interface StudyTotals {
  sessions: number;
  seconds: number;
  correct: number;
  total: number;
}

export interface ReviewSummary {
  feature: "vocab" | "grammar";
  due: number;
  pending: number;
}

export interface StatsSummary {
  today: StudyTotals;
  skills: { skill: Skill; week: StudyTotals; month: StudyTotals }[];
  types: { type: string; month: StudyTotals }[];
  daily: { date: string; seconds: Record<Skill, number> }[];
  review: Record<string, ReviewSummary>;
}

export interface StudyLogItem {
  id: number;
  feature: string;
  type: string;
  itemId: string | null;
  correct: number | null;
  total: number | null;
  durationSeconds: number;
  createdAt: string;
}

export async function fetchStatsSummary() {
  return getJson<StatsSummary>("/api/stats/summary", "学習記録の取得に失敗しました");
}

export async function fetchStudyHistory() {
  return getJson<StudyLogItem[]>("/api/stats/history", "履歴の取得に失敗しました");
}

/** 文法の分野・語彙の品詞・読解/リスニングの設問タイプ別の成績(全期間) */
export interface WeaknessItem {
  feature: "grammar" | "vocab" | "reading" | "listening";
  type: string;
  category: string;
  correct: number;
  total: number;
}

export async function fetchWeakness() {
  return getJson<WeaknessItem[]>("/api/stats/weakness", "弱点分析の取得に失敗しました");
}

// レベル(経験値)と、期限(2027年3月末に Lv.100)までの学習ペース
export interface LevelSummary {
  level: number;
  maxLevel: number;
  totalXp: number;
  /** 今のレベルに上がった累計経験値 */
  levelStartXp: number;
  /** 次のレベルに必要な累計経験値(Lv.100 なら null) */
  nextLevelXp: number | null;
  /** 今日の内訳。total = (answers + time + bonus) × multiplier */
  today: {
    total: number;
    answers: number;
    time: number;
    bonus: number;
    multiplier: number;
    minutes: number;
    skills: number;
  };
  streakDays: number;
  dailyTargetXp: number;
  /** 予定どおりなら今日の始まりに持っているはずの累計経験値 */
  expectedXp: number;
  expectedLevel: number;
  pace: "ahead" | "onTrack" | "behind";
  xpPerDayToGoal: number;
  daysLeft: number;
  goalDate: string;
  recentDays: { date: string; xp: number }[];
}

export async function fetchLevel() {
  return getJson<LevelSummary>("/api/level", "レベルの取得に失敗しました");
}

export async function fetchReviewSummary() {
  return getJson<Record<string, ReviewSummary>>("/api/review/summary", "復習の件数の取得に失敗しました");
}

// 単語帳(英単語の色・出題・登録)。色は利用者が手動で付け、出題の頻度に使う
export type WordbookColor = "NONE" | "BLUE" | "YELLOW" | "RED";

export interface WordbookWord {
  id: number;
  word: string;
  meaningJa: string | null;
  exampleEn: string | null;
  exampleAnswer: string | null;
  exampleJa: string | null;
  source: "BUNDLED" | "READING" | "MANUAL";
  color: WordbookColor;
  translationStatus: "PENDING" | "DONE" | "FAILED";
  createdAt: string;
}

export interface WordbookSummary {
  total: number;
  none: number;
  blue: number;
  yellow: number;
  red: number;
  pendingTranslation: number;
}

export interface WordbookAddResult {
  added: boolean;
  word: WordbookWord;
}

export interface WordbookChoiceQuestion {
  wordId: number;
  word: string;
  choices: string[];
}

export interface WordbookFillQuestion {
  wordId: number;
  /** 対象語を _____ にした英文 */
  sentence: string;
  translation: string;
}

export interface WordbookAnswerResult {
  correct: boolean;
  word: string;
  meaningJa: string | null;
  correctAnswer: string;
  exampleEn: string | null;
  exampleJa: string | null;
  color: WordbookColor;
}

export interface WordbookHistoryItem {
  wordId: number;
  word: string;
  correct: boolean;
  createdAt: string;
}

/** 直近に出した語の ID を exclude で渡し、同じ語が続けて出ないようにする */
const wordbookExclude = (ids: number[]) => (ids.length ? `exclude=${ids.join(",")}` : "");

export async function fetchWordbookSummary() {
  return getJson<WordbookSummary>("/api/wordbook/summary", "単語帳の取得に失敗しました");
}

export async function fetchWordbookWords(color?: WordbookColor, query?: string) {
  const params = new URLSearchParams();
  if (color) params.set("color", color);
  if (query) params.set("q", query);
  const qs = params.toString();
  return getJson<WordbookWord[]>(`/api/wordbook/words${qs ? `?${qs}` : ""}`, "単語一覧の取得に失敗しました");
}

/** 手動登録(読解から登録する場合は registerReadingWord を使う) */
export async function addWordbookWord(word: string) {
  return postJson<WordbookAddResult>("/api/wordbook/words", { word }, "登録に失敗しました");
}

/** 読解の本文から登録する。sentence は選んだ語を含む文、answer は本文中の選んだ語 */
export async function registerReadingWord(word: string, sentence: string) {
  return postJson<WordbookAddResult>(
    "/api/wordbook/words",
    { word, exampleEn: sentence, exampleAnswer: word },
    "登録に失敗しました",
  );
}

export async function setWordbookColor(id: number, color: WordbookColor) {
  return getJson<WordbookWord>(`/api/wordbook/words/${id}/color`, "色の変更に失敗しました", jsonBody("PUT", { color }));
}

export async function setWordbookMeaning(id: number, meaningJa: string) {
  return getJson<WordbookWord>(`/api/wordbook/words/${id}`, "訳の変更に失敗しました", jsonBody("PUT", { meaningJa }));
}

export async function deleteWordbookWord(id: number) {
  await send(`/api/wordbook/words/${id}`, "削除に失敗しました", { method: "DELETE" });
}

export async function fetchWordbookChoice(exclude: number[]) {
  return getJson<WordbookChoiceQuestion>(
    `/api/wordbook/quiz/choice?${wordbookExclude(exclude)}`,
    "問題の取得に失敗しました",
  );
}

export async function submitWordbookChoice(wordId: number, selectedMeaning: string, durationSeconds: number) {
  return postJson<WordbookAnswerResult>(
    "/api/wordbook/quiz/choice/answer",
    { wordId, selectedMeaning, durationSeconds },
    "採点に失敗しました",
  );
}

export async function fetchWordbookFill(exclude: number[]) {
  return getJson<WordbookFillQuestion>(
    `/api/wordbook/quiz/fill?${wordbookExclude(exclude)}`,
    "問題の取得に失敗しました",
  );
}

export async function submitWordbookFill(wordId: number, typed: string, durationSeconds: number) {
  return postJson<WordbookAnswerResult>(
    "/api/wordbook/quiz/fill/answer",
    { wordId, typed, durationSeconds },
    "採点に失敗しました",
  );
}

export async function fetchWordbookHistory() {
  return getJson<WordbookHistoryItem[]>("/api/wordbook/history", "履歴の取得に失敗しました");
}

// アクセス履歴(閲覧キーが必要。キーはサーバーの環境変数 ACCESS_LOG_KEY と同じ値)
export interface AccessIpSummary {
  ip: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  devices: string;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
}

export interface AccessLogItem {
  createdAt: string;
  ip: string;
  method: string;
  path: string;
  device: string;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
}

export interface AccessLogResponse {
  days: number;
  total: number;
  summaries: AccessIpSummary[];
  recent: AccessLogItem[];
}

export class AccessLogKeyError extends Error {}

export async function fetchAccessLogs(key: string, days: number) {
  const res = await fetch(`${API_BASE}/api/access-logs?days=${days}`, {
    headers: { "X-Access-Log-Key": key },
  });
  if (res.status === 403) {
    throw new AccessLogKeyError(await errorMessage(res, "閲覧キーが違います"));
  }
  if (!res.ok) throw new Error("アクセス履歴の取得に失敗しました");
  return res.json() as Promise<AccessLogResponse>;
}

// 端末登録(この API を使えるのは登録済みの端末だけ。最大3台)
export interface DeviceView {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** この端末なら true */
  current: boolean;
}

/** 合言葉(サーバーの APP_ACCESS_KEY)で、この端末を登録する。発行された鍵は呼び出し側が saveDeviceToken で保存する */
export async function registerDevice(key: string, name: string) {
  return postJson<{ token: string; device: DeviceView }>(
    "/api/devices/register",
    { key, name },
    "端末の登録に失敗しました",
  );
}

export async function fetchDevices() {
  return getJson<DeviceView[]>("/api/devices", "端末の一覧の取得に失敗しました");
}

export async function deleteDevice(id: number) {
  await send(`/api/devices/${id}`, "端末の削除に失敗しました", { method: "DELETE" });
}
