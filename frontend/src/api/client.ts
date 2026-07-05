const API_BASE = import.meta.env.VITE_API_BASE_URL;

export async function fetchWritingQuestion() {
  const res = await fetch(`${API_BASE}/api/writing/question`);
  if (!res.ok) throw new Error("Failed to fetch question");
  return res.json() as Promise<{ topic: string; instructions: string }>;
}
