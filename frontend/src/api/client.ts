const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function fetchWritingQuestion() {
  const res = await fetch(`${API_BASE}/api/writing/question`);
  if (!res.ok) throw new Error("Failed to fetch question");
  return res.json() as Promise<{
    prompt: string;
    topic: string;
    points: string[];
  }>;
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
  topic: string,
  prompt: string,
  points: string[],
  answer: string,
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/writing/score`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ topic, prompt, points, answer }),
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
