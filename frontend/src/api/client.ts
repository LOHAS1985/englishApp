const API_BASE = import.meta.env.VITE_API_BASE_URL;

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

export async function fetchWritingQuestion(type: WritingType) {
  const res = await fetch(`${API_BASE}/api/writing/question?type=${type}`);
  if (!res.ok) throw new Error("Failed to fetch question");
  return res.json() as Promise<WritingQuestion>;
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
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/writing/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ questionId, answer }),
  });
  if (!res.ok) throw new Error("Failed to score answer");
  return res.json() as Promise<ScoreResult>;
}

export async function register(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok)
    throw new Error((await res.json()).message ?? "登録に失敗しました");
  return res.json() as Promise<{ token: string; username: string }>;
}

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok)
    throw new Error((await res.json()).message ?? "ログインに失敗しました");
  return res.json() as Promise<{ token: string; username: string }>;
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

export async function fetchWritingHistory(token: string) {
  const res = await fetch(`${API_BASE}/api/writing/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("履歴の取得に失敗しました");
  return res.json() as Promise<WritingHistoryItem[]>;
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

export async function fetchGrammarQuestion() {
  const res = await fetch(`${API_BASE}/api/grammar/question`);
  if (!res.ok) throw new Error("Failed to fetch grammar question");
  return res.json() as Promise<GrammarQuestion>;
}

export async function submitGrammarAnswer(
  questionId: string,
  selectedChoice: string,
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/grammar/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ questionId, selectedChoice }),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  return res.json() as Promise<GrammarAnswerResult>;
}

// 語彙問題(形は文法問題と同じ)
export async function fetchVocabQuestion() {
  const res = await fetch(`${API_BASE}/api/vocab/question`);
  if (!res.ok) throw new Error("Failed to fetch vocab question");
  return res.json() as Promise<GrammarQuestion>;
}

export async function submitVocabAnswer(
  questionId: string,
  selectedChoice: string,
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/vocab/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ questionId, selectedChoice }),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  return res.json() as Promise<GrammarAnswerResult>;
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

export async function fetchGrammarHistory(token: string) {
  const res = await fetch(`${API_BASE}/api/grammar/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("履歴の取得に失敗しました");
  return res.json() as Promise<GrammarHistoryItem[]>;
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

  const res = await fetch(
    `${API_BASE}/api/reading/articles?${params.toString()}`,
  );
  if (!res.ok) throw new Error("記事の取得に失敗しました");
  return res.json() as Promise<ArticleSummary[]>;
}

export async function fetchArticleDetail(id: string) {
  const params = new URLSearchParams({ id });
  const res = await fetch(
    `${API_BASE}/api/reading/article?${params.toString()}`,
  );
  if (!res.ok) throw new Error("記事の取得に失敗しました");
  return res.json() as Promise<ArticleDetail>;
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
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/reading/record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      articleId,
      articleTitle,
      wordCount,
      durationSeconds,
    }),
  });
  if (!res.ok) throw new Error("記録の保存に失敗しました");
  return res.json() as Promise<ReadingRecordResult>;
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

const authHeaders = (token?: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

type PracticeFeature = "reading" | "listening";

export async function fetchPracticeTypes(
  feature: PracticeFeature,
  token?: string | null,
) {
  const res = await fetch(`${API_BASE}/api/${feature}/practice/types`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("形式の取得に失敗しました");
  return res.json() as Promise<Record<string, number>>;
}

export async function fetchPracticeSet(
  feature: PracticeFeature,
  type: string,
  token?: string | null,
) {
  const res = await fetch(
    `${API_BASE}/api/${feature}/practice?type=${encodeURIComponent(type)}`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("問題の取得に失敗しました");
  return res.json() as Promise<QuestionSetView>;
}

export async function submitPracticeAnswers(
  feature: PracticeFeature,
  setId: string,
  answers: string[],
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/${feature}/practice/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ setId, answers }),
  });
  if (!res.ok) throw new Error("採点に失敗しました");
  return res.json() as Promise<SetAnswerResult>;
}

/** サーバーで台本を音声化する。結果は1ファイル(audioUrl)か行ごと(audioUrls) */
export async function synthesizeListeningAudio(setId: string, token: string) {
  const res = await fetch(`${API_BASE}/api/listening/practice/${setId}/audio`, {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("音声の生成に失敗しました");
  return res.json() as Promise<{ audioUrl?: string; audioUrls?: string[] }>;
}

/** ブラウザの読み上げ機能で再生するための台本(画面には表示しない) */
export async function fetchListeningScript(setId: string, token: string) {
  const res = await fetch(
    `${API_BASE}/api/listening/practice/${setId}/script`,
    { headers: authHeaders(token) },
  );
  if (!res.ok) throw new Error("台本の取得に失敗しました");
  return (await res.json()).script as string;
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

export async function fetchSpeakingSet() {
  const res = await fetch(`${API_BASE}/api/speaking/question`);
  if (!res.ok) throw new Error("問題の取得に失敗しました");
  return res.json() as Promise<SpeakingSet>;
}

// MCP proxy helpers (backend -> MCP server)
export async function listMcpTools(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-KEY"] = apiKey;
  const res = await fetch(`${API_BASE}/api/mcp/list`, { headers });
  if (!res.ok) throw new Error("Failed to list MCP tools");
  return res.json() as Promise<unknown[]>;
}

export async function callMcpTool(
  name: string,
  args: Record<string, unknown> = {},
  apiKey?: string,
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["X-API-KEY"] = apiKey;
  const res = await fetch(`${API_BASE}/api/mcp/call`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, arguments: args }),
  });
  if (!res.ok) throw new Error("Failed to call MCP tool");
  return res.json() as Promise<unknown>;
}
