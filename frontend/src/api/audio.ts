const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function getListeningExercises() {
  const res = await fetch(`${API_BASE}/api/listening/exercises`);
  if (!res.ok) throw new Error('Failed to fetch exercises');
  return res.json();
}

export async function submitListeningAnswer(exerciseId: number, answer: string) {
  const res = await fetch(`${API_BASE}/api/listening/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exerciseId, answer }),
  });
  if (!res.ok) throw new Error('Submit failed');
  return res.json();
}

export async function uploadRecording(file: File, exerciseId?: number) {
  const form = new FormData();
  form.append('file', file);
  if (exerciseId) form.append('exerciseId', String(exerciseId));
  const res = await fetch(`${API_BASE}/api/speaking/recordings`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export default {};
