import {
  getListeningExercises,
  submitListeningAnswer,
  synthesizeDialog,
  API_BASE,
} from "../../api/audio";
import React, { useEffect, useState } from "react";
import Header from "../../shared/components/Header";

export default function Listening() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const [queue, setQueue] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    getListeningExercises()
      .then((data) => setExercises(data))
      .catch(() => setExercises([]));
  }, []);

  const start = (ex: any, idx: number) => {
    setSelected(ex);
    setSelectedIndex(idx);
    setChoice("");
    setResult("");
    setAnswered(false);
  };

  const submit = async () => {
    if (!selected) return;
    try {
      const r = await submitListeningAnswer(selected.id, choice);
      setResult(`Score: ${r.score} ${r.correct ? "✅" : "❌"}`);
      setAnswered(true);
    } catch (e) {
      setResult("Submit failed");
    }
  };

  const goToNext = () => {
    if (selectedIndex == null) return;
    const next = selectedIndex + 1;
    if (next < exercises.length) {
      start(exercises[next], next);
    } else {
      // no more questions
      setSelected(null);
      setSelectedIndex(null);
    }
  };

  const stopServerAudio = () => {
    if (currentAudio) {
      try {
        currentAudio.pause();
      } catch {}
      setCurrentAudio(null);
    }
    setQueue([]);
  };

  const playSequential = async (urls: string[]) => {
    setQueue(urls);
    for (let i = 0; i < urls.length; i++) {
      const src = urls[i];
      await new Promise<void>((resolve, reject) => {
        const a = new Audio(src);
        setCurrentAudio(a);
        a.onended = () => {
          resolve();
        };
        a.onerror = () => {
          resolve();
        };
        a.play().catch(() => resolve());
      });
      if (!queue || queue.length === 0) break; // stopped externally
    }
    setCurrentAudio(null);
    setQueue([]);
  };

  const generateAndPlay = async () => {
    if (!selected || !selected.dialogText) return;
    setIsGenerating(true);
    try {
      const base = `toeic_${selected.id}_${Date.now()}`;
      const res = await synthesizeDialog(selected.dialogText, base);
      let urls: string[] = [];
      if (res.audioUrls && Array.isArray(res.audioUrls)) {
        urls = res.audioUrls;
      } else if (res.audioUrl && typeof res.audioUrl === "string") {
        urls = [res.audioUrl];
      }
      if (urls.length) {
        // convert to absolute backend URLs when needed (encode paths)
        const abs = urls.map((u) => {
          if (!u) return u;
          if (/^https?:\/\//i.test(u)) return u;
          const path = encodeURI(u);
          if (API_BASE) return API_BASE.replace(/\/$/, "") + path;
          // fallback: assume backend at same host:port 8080
          try {
            return `${window.location.protocol}//${window.location.hostname}:8080${path}`;
          } catch {
            return u;
          }
        });
        // If there's only one combined url, set it on the selected item and play immediately.
        if (abs.length === 1) {
          const newUrl = abs[0];
          // update selected.audioUrl so the UI audio control points to it
          try {
            setSelected({ ...selected, audioUrl: newUrl });
          } catch {}
          // play immediately using programmatic audio element
          await new Promise<void>((resolve) => {
            const a = new Audio(newUrl);
            setCurrentAudio(a);
            a.crossOrigin = "anonymous";
            a.onended = () => {
              resolve();
            };
            a.onerror = () => {
              resolve();
            };
            // play may reject if blocked, but this is a user-initiated click
            a.play().catch(() => resolve());
          });
          setCurrentAudio(null);
        } else {
          await playSequential(abs);
        }
      }
    } catch (e) {
      console.error(e);
      setResult("Synthesize failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Ensure choices are always 3 options (A/B/C) for display
  const getThreeChoices = (choices: any) => {
    const out: string[] = [];
    if (Array.isArray(choices)) {
      for (let i = 0; i < 3; i++) {
        if (i < choices.length && choices[i]) {
          // Normalize: if choices include 'A. ' prefix, keep it; otherwise add letter prefix
          const txt = String(choices[i]);
          if (/^[A-Ca-c]\.\s*/.test(txt)) out.push(txt);
          else out.push(`${String.fromCharCode(65 + i)}. ${txt}`);
        } else {
          out.push(`${String.fromCharCode(65 + i)}. ---`);
        }
      }
    } else {
      out.push("A. ---", "B. ---", "C. ---");
    }
    return out;
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-5 py-12">
        <div className="w-full max-w-[720px] bg-white border border-slate-200 rounded-md p-8">
          <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
            LISTENING
          </p>
          <h1 className="font-serif text-2xl text-slate-900 mb-4">
            リスニング練習
          </h1>

          {!selected && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-3">
                  問題をランダムに出題します。すぐ始めるには下のボタンを押してください。
                </p>
                <button
                  onClick={() => {
                    if (!exercises || exercises.length === 0) return;
                    const idx = Math.floor(Math.random() * exercises.length);
                    start(exercises[idx], idx);
                  }}
                  className="bg-[#8fae4e] text-white px-6 py-3 rounded-md hover:bg-[#7a9843]"
                >
                  練習を開始
                </button>
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-6 bg-slate-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {`問題 ${selectedIndex != null ? selectedIndex + 1 : ""}`}
                  </h3>
                  <p className="text-sm text-slate-500">
                    音声を聞いて正しい答えを選んでください。
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <audio
                    controls
                    src={(() => {
                      const u = selected.audioUrl;
                      if (!u) return undefined;
                      if (/^https?:\/\//i.test(u)) return u;
                      if (API_BASE) return API_BASE.replace(/\/$/, "") + u;
                      return `${window.location.protocol}//${window.location.hostname}:8080${u}`;
                    })()}
                    crossOrigin="anonymous"
                    className="w-full sm:w-auto"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateAndPlay}
                      disabled={isGenerating}
                      className="text-sm px-3 py-1 bg-[#2463a8] text-white rounded-md"
                    >
                      {isGenerating ? "Generating..." : "Play (Server TTS)"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-slate-700 mb-3">
                  {selected.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {getThreeChoices(selected.choices).map(
                    (text: string, i: number) => {
                      const opt = String.fromCharCode(65 + i); // A, B, C
                      const display = text
                        ? text.replace(/^[A-Ca-c]\.\s*/i, "")
                        : text;
                      return (
                        <button
                          key={opt}
                          onClick={() => !answered && setChoice(opt)}
                          className={`py-3 rounded-md border text-sm font-medium text-left px-4 ${choice === opt ? "bg-[#8fae4e] text-white border-[#8fae4e]" : "bg-white text-slate-700 border-slate-200"}`}
                          disabled={answered}
                        >
                          <div className="font-semibold">{opt}</div>
                          <div className="text-sm text-slate-600">
                            {display}
                          </div>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={submit}
                  className="bg-[#16233d] text-white px-4 py-2 rounded-md"
                  disabled={answered}
                >
                  解答
                </button>
                {answered && (
                  <button
                    onClick={goToNext}
                    className="bg-[#8fae4e] text-white px-4 py-2 rounded-md"
                  >
                    次の問題へ
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelected(null);
                    setResult("");
                    setSelectedIndex(null);
                  }}
                  className="text-sm text-slate-600"
                >
                  閉じる
                </button>
                <div className="ml-auto text-sm text-slate-700">{result}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
