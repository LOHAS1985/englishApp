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
  points: string[],
  answer: string,
) {
  const res = await fetch(`${API_BASE}/api/writing/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, points, answer }),
  });
  if (!res.ok) throw new Error("Failed to score answer");
  return res.json() as Promise<ScoreResult>;
}
