const API_BASE = import.meta.env.VITE_API_BASE_URL;

/** 画面に表示中の問題を exclude で渡し、次の問題(先読み)で同じ問題が選ばれないようにする */
const excludeParam = (exclude?: string | null) =>
  exclude ? `exclude=${encodeURIComponent(exclude)}` : "";

/** サーバーが {"error": "..."} を返していればその文言を、無ければ既定の文言を使う */
async function errorMessage(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error || fallback;
}

async function send(path: string, fallbackError: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(await errorMessage(res, fallbackError));
  return res;
}

async function getJson<T>(path: string, fallbackError: string, init?: RequestInit) {
  const res = await send(path, fallbackError, init);
  return res.json() as Promise<T>;
}

function jsonBody(method: "POST" | "PUT", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function postJson<T>(path: string, body: unknown, fallbackError: string) {
  return getJson<T>(path, fallbackError, jsonBody("POST", body));
}

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
}

export interface GrammarAnswerResult {
  correct: boolean;
  correctChoice: string;
  explanation: string;
  translation: string;
}

/** review: true なら復習日が来た間違えた問題から出す(無ければエラー「今日の復習はすべて終わりました」) */
export async function fetchGrammarQuestion(exclude?: string | null, review = false) {
  return getJson<GrammarQuestion>(
    `/api/grammar/question?review=${review}&${excludeParam(exclude)}`,
    "問題の取得に失敗しました",
  );
}

export async function submitGrammarAnswer(
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  return postJson<GrammarAnswerResult>(
    "/api/grammar/answer",
    { questionId, selectedChoice, durationSeconds },
    "採点に失敗しました",
  );
}

// 語彙問題(形は文法問題と同じ)
export async function fetchVocabQuestion(exclude?: string | null, review = false) {
  return getJson<GrammarQuestion>(
    `/api/vocab/question?review=${review}&${excludeParam(exclude)}`,
    "問題の取得に失敗しました",
  );
}

export async function submitVocabAnswer(
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  return postJson<GrammarAnswerResult>(
    "/api/vocab/answer",
    { questionId, selectedChoice, durationSeconds },
    "採点に失敗しました",
  );
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
  questions: SetQuestionView[];
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

export async function fetchPracticeTypes(feature: PracticeFeature) {
  return getJson<Record<string, number>>(
    `/api/${feature}/practice/types`,
    "形式の取得に失敗しました",
  );
}

export async function fetchPracticeSet(
  feature: PracticeFeature,
  type: string,
  exclude?: string | null,
) {
  return getJson<QuestionSetView>(
    `/api/${feature}/practice?type=${encodeURIComponent(type)}&${excludeParam(exclude)}`,
    "問題の取得に失敗しました",
  );
}

export async function submitPracticeAnswers(
  feature: PracticeFeature,
  setId: string,
  answers: string[],
  durationSeconds?: number,
) {
  return postJson<SetAnswerResult>(
    `/api/${feature}/practice/answer`,
    { setId, answers, durationSeconds },
    "採点に失敗しました",
  );
}

/** サーバーで台本を音声化する。結果は1ファイル(audioUrl)か行ごと(audioUrls) */
export async function synthesizeListeningAudio(setId: string) {
  return getJson<{ audioUrl?: string; audioUrls?: string[] }>(
    `/api/listening/practice/${setId}/audio`,
    "音声の生成に失敗しました",
    { method: "POST" },
  );
}

/** ブラウザの読み上げ機能で再生するための台本(画面には表示しない) */
export async function fetchListeningScript(setId: string) {
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

export async function fetchReviewSummary() {
  return getJson<Record<string, ReviewSummary>>("/api/review/summary", "復習の件数の取得に失敗しました");
}

// 管理画面(単語の登録・編集)
export interface AdminWord {
  id: number;
  word: string;
  meaningEn: string;
  exampleEn: string;
  meaningJa: string;
  exampleJa: string;
  createdAt: string;
}

export type AdminWordForm = Pick<
  AdminWord,
  "word" | "meaningEn" | "exampleEn" | "meaningJa" | "exampleJa"
>;

/** meaningEn / exampleEn を省略すると、サーバーが辞書から補う */
export async function createAdminWord(input: {
  word: string;
  meaningEn?: string;
  exampleEn?: string;
}) {
  return postJson<AdminWord>("/api/admin/words", input, "登録に失敗しました");
}

export async function fetchAdminWords() {
  return getJson<AdminWord[]>("/api/admin/words", "単語一覧の取得に失敗しました");
}

export async function updateAdminWord(id: number, form: AdminWordForm) {
  return getJson<AdminWord>(`/api/admin/words/${id}`, "更新に失敗しました", jsonBody("PUT", form));
}

export async function deleteAdminWord(id: number) {
  await send(`/api/admin/words/${id}`, "削除に失敗しました", { method: "DELETE" });
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
