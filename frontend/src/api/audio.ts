export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function getListeningExercises(token: string) {
  const res = await fetch(`${API_BASE}/api/listening/exercises`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error("Failed to fetch exercises");
  return res.json();
}

export async function synthesizeDialog(
  dialogText: string,
  token: string,
  base?: string,
) {
  const res = await fetch(`${API_BASE}/api/listening/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ dialogText, base }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Synthesize failed: ${res.status} ${txt}`);
  }
  return res.json();
}

export async function submitListeningAnswer(
  exerciseId: number,
  answer: string,
  token: string,
) {
  const res = await fetch(`${API_BASE}/api/listening/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader(token) },
    body: JSON.stringify({ exerciseId, answer }),
  });
  if (!res.ok) throw new Error("Submit failed");
  return res.json();
}

export async function uploadRecording(
  file: File,
  token: string,
  exerciseId?: number,
) {
  const form = new FormData();
  form.append("file", file);
  if (exerciseId) form.append("exerciseId", String(exerciseId));
  const res = await fetch(`${API_BASE}/api/speaking/recordings`, {
    method: "POST",
    headers: authHeader(token),
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export default {};
