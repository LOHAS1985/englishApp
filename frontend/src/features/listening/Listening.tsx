import React, { useEffect, useState } from "react";
import { getListeningExercises, submitListeningAnswer } from "../../api/audio";

export default function Listening() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    getListeningExercises()
      .then((data) => setExercises(data))
      .catch(() => setExercises([]));
  }, []);

  const start = (ex: any) => {
    setSelected(ex);
    setChoice("");
    setResult("");
  };

  const submit = async () => {
    if (!selected) return;
    try {
      const r = await submitListeningAnswer(selected.id, choice);
      setResult(`Score: ${r.score} ${r.correct ? '✅' : '❌'}`);
    } catch (e) {
      setResult("Submit failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-serif text-slate-900 mb-4">Listening Practice</h2>

        <div className="space-y-4">
          {exercises.map((ex) => (
            <div key={ex.id} className="bg-white border rounded-md p-4 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">{ex.title}</div>
                <div className="text-sm text-slate-500">Audio exercise</div>
              </div>
              <div>
                <button
                  onClick={() => start(ex)}
                  className="bg-[#8fae4e] text-white px-4 py-2 rounded-md hover:bg-[#7a9843]"
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-slate-900">{selected.title}</h3>
                <p className="text-sm text-slate-500">Listen carefully and choose the correct answer.</p>
              </div>
              <audio controls src={selected.audioUrl} className="ml-4" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {['A','B','C'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setChoice(opt)}
                  className={`py-3 rounded-md border text-sm font-medium ${choice===opt ? 'bg-[#8fae4e] text-white border-[#8fae4e]' : 'bg-white text-slate-700 border-slate-200'}`}
                >
                  {opt}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={submit} className="bg-[#16233d] text-white px-4 py-2 rounded-md">Submit</button>
              <button onClick={() => { setSelected(null); setResult(''); }} className="text-sm text-slate-600">Close</button>
              <div className="ml-auto text-sm text-slate-700">{result}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
