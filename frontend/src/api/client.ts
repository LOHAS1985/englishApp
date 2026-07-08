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
