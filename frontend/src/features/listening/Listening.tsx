import React, { useEffect, useState } from 'react';
import { getListeningExercises, submitListeningAnswer } from '../../api/audio';

export default function Listening() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [choice, setChoice] = useState<string>('');
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    getListeningExercises().then((data) => setExercises(data)).catch(() => setExercises([]));
  }, []);

  const start = (ex: any) => {
    setSelected(ex);
    setChoice('');
    setResult('');
  };

  const submit = async () => {
    if (!selected) return;
    try {
      const r = await submitListeningAnswer(selected.id, choice);
      setResult(`score: ${r.score}`);
    } catch (e) {
      setResult('submit failed');
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h3>Listening</h3>
      <div>
        {exercises.map((ex) => (
          <div key={ex.id} style={{ marginBottom: 8 }}>
            <strong>{ex.title}</strong>
            <button onClick={() => start(ex)} style={{ marginLeft: 8 }}>Start</button>
          </div>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 12 }}>
          <audio controls src={selected.audioUrl} />
          <div style={{ marginTop: 8 }}>
            <label>Answer (e.g. A/B/C): </label>
            <input value={choice} onChange={(e) => setChoice(e.target.value)} />
            <button onClick={submit} style={{ marginLeft: 8 }}>Submit</button>
          </div>
          <div style={{ marginTop: 8 }}><strong>{result}</strong></div>
        </div>
      )}
    </div>
  );
}
