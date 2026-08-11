import {
  getListeningExercises,
  submitListeningAnswer,
  synthesizeDialog,
  API_BASE,
} from "../../api/audio";
import { useEffect, useState, useRef } from "react";
import Header from "../../shared/components/Header";

export default function Listening() {
  // groups: one dialog -> multiple questions
  interface ListeningItem {
    id: number;
    question: string;
    choices?: string[];
    dialogText?: string;
    audioUrl?: string;
  }
  type Group = {
    dialogText?: string;
    audioUrl?: string;
    items: ListeningItem[];
  };

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<string>("");
  const [correctMap, setCorrectMap] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    getListeningExercises()
      .then((data) => {
        // group by dialogText + audioUrl
        const map = new Map<string, Group>();
        const list = (data || []) as ListeningItem[];
        list.forEach((ex) => {
          const key = `${ex.dialogText || ""}||${ex.audioUrl || ""}`;
          if (!map.has(key))
            map.set(key, {
              dialogText: ex.dialogText,
              audioUrl: ex.audioUrl,
              items: [],
            });
          map.get(key)!.items.push(ex);
        });
        setGroups(Array.from(map.values()));
      })
      .catch(() => {
        setGroups([]);
      });
  }, []);

  const start = (group: Group, idx: number) => {
    stopPlayback();
    setSelectedGroup(group);
    setQuestionIndex(idx || 0);
    setAnswers({});
    setResult("");
    setAnswered(false);
  };

  // Submit all answers for the current group at once
  const submitAll = async () => {
    if (!selectedGroup) return;
    const items = selectedGroup.items || [];
    const promises = items.slice(0, 3).map(async (it: ListeningItem) => {
      const ans = answers[it.id];
      try {
        const r = await submitListeningAnswer(it.id, ans || "");
        return {
          id: it.id,
          score: r.score,
          correct: r.correct,
          correctAnswer: r.correctAnswer,
        };
      } catch {
        return { id: it.id, score: 0, correct: false, correctAnswer: "" };
      }
    });
    const res = await Promise.all(promises);
    const total = res.reduce((s, r) => s + (r.score || 0), 0);
    setResult(`Total: ${total} / ${res.length}`);
    // populate correctMap for display
    const cm: Record<number, string> = {};
    res.forEach((r) => {
      cm[r.id] = r.correctAnswer || "";
    });
    setCorrectMap(cm);
    setAnswered(true);
  };

  const goToNext = () => {
    // stop any ongoing playback when moving to next
    stopPlayback();
    if (!groups || groups.length === 0) {
      setSelectedGroup(null);
      return;
    }
    // pick next group deterministically based on current group's index
    if (!selectedGroup) {
      start(groups[0], 0);
      return;
    }
    const cur = groups.findIndex(
      (g) =>
        g.dialogText === selectedGroup.dialogText &&
        g.audioUrl === selectedGroup.audioUrl,
    );
    const nextIdx = cur >= 0 ? (cur + 1) % groups.length : 0;
    start(groups[nextIdx], 0);
  };

  const stopPlayback = () => {
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current = null;
      }
    } catch {
      void 0;
    }
    setQueue([]);
  };

  // stopServerAudio removed (unused)

  const playSequential = async (urls: string[]) => {
    setQueue(urls);
    for (let i = 0; i < urls.length; i++) {
      const src = urls[i];
      await new Promise<void>((resolve) => {
        const a = new Audio(src);
        currentAudioRef.current = a;
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
    currentAudioRef.current = null;
    setQueue([]);
  };

  // wait until a URL is available (HEAD returns OK) or timeout
  const waitForUrl = async (
    url: string,
    timeoutMs = 8000,
  ): Promise<boolean> => {
    const start = Date.now();
    const interval = 250;
    while (Date.now() - start < timeoutMs) {
      try {
        const r = await fetch(url, { method: "HEAD" });
        if (r.ok) return true;
      } catch {
        void 0;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    return false;
  };

  const generateAndPlay = async () => {
    if (!selectedGroup || !selectedGroup.dialogText) return;
    setIsGenerating(true);
    try {
      const base = `toeic_${(selectedGroup.items && selectedGroup.items[0] && selectedGroup.items[0].id) || "0"}_${Date.now()}`;
      const res = await synthesizeDialog(selectedGroup.dialogText, base);
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
          // update selectedGroup.audioUrl so the UI audio control points to it
          try {
            setSelectedGroup({ ...selectedGroup, audioUrl: newUrl });
          } catch {
            void 0;
          }
          // wait until the backend file becomes available (avoid 404)
          const ready = await waitForUrl(newUrl, 8000);
          if (!ready) {
            setResult("Audio not yet available, please try again in a moment");
          } else {
            // play immediately using programmatic audio element
            await new Promise<void>((resolve) => {
              const a = new Audio(newUrl);
              currentAudioRef.current = a;
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
          }
          currentAudioRef.current = null;
        } else {
          await playSequential(abs);
        }
      }
    } catch (e) {
      // log error for debugging
      // eslint-disable-next-line no-console
      console.error(e);
      setResult("Synthesize failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Ensure choices are always 3 options (A/B/C) for display
  const getThreeChoices = (choices: unknown) => {
    const out: string[] = [];
    if (Array.isArray(choices)) {
      for (let i = 0; i < 3; i++) {
        if (
          i < (choices as unknown as string[]).length &&
          (choices as unknown as string[])[i]
        ) {
          // Normalize: if choices include 'A. ' prefix, keep it; otherwise add letter prefix
          const txt = String((choices as unknown as string[])[i]);
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

          {!selectedGroup && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-3">
                  問題をランダムに出題します。すぐ始めるには下のボタンを押してください。
                </p>
                <button
                  onClick={() => {
                    if (!groups || groups.length === 0) return;
                    const idx = Math.floor(Math.random() * groups.length);
                    start(groups[idx], 0);
                  }}
                  className="bg-[#8fae4e] text-white px-6 py-3 rounded-md hover:bg-[#7a9843]"
                >
                  練習を開始
                </button>
              </div>
            </div>
          )}

          {selectedGroup && (
            <div className="mt-6 bg-slate-50 p-6 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {`問題 ${questionIndex != null ? questionIndex + 1 : ""}`}
                  </h3>
                  <p className="text-sm text-slate-500">
                    音声を聞いて正しい答えを選んでください。
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <audio
                    controls
                    src={(() => {
                      const u = selectedGroup
                        ? selectedGroup.audioUrl
                        : undefined;
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

              <div className="space-y-4">
                {(selectedGroup.items || [])
                  .slice(0, 3)
                  .map((it: ListeningItem, idx: number) => {
                    const choices = getThreeChoices(it.choices || []);
                    return (
                      <div
                        key={it.id}
                        className="p-3 bg-white rounded-md border"
                      >
                        <div className="text-sm font-medium mb-2">{`Q${idx + 1}. ${it.question}`}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {choices.map((text: string, i: number) => {
                            const opt = String.fromCharCode(65 + i);
                            const display = text
                              ? text.replace(/^[A-Ca-c]\.\s*/i, "")
                              : text;
                            const selectedOpt = answers[it.id];
                            return (
                              <button
                                key={opt}
                                onClick={() =>
                                  !answered &&
                                  setAnswers({ ...answers, [it.id]: opt })
                                }
                                className={`py-3 rounded-md border text-sm font-medium text-left px-4 ${selectedOpt === opt ? "bg-[#8fae4e] text-white border-[#8fae4e]" : "bg-white text-slate-700 border-slate-200"}`}
                                disabled={answered}
                              >
                                <div className="font-semibold">{opt}</div>
                                <div className="text-sm text-slate-600">
                                  {display}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={submitAll}
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

                <div className="ml-auto text-sm text-slate-700">{result}</div>
              </div>
              {/* show correct answers and script when answered */}
              {answered && (
                <div className="mt-4 bg-white border rounded-md p-4">
                  <div className="text-sm font-medium mb-2">
                    正答とスクリプト
                  </div>
                  <div className="space-y-2">
                    {(selectedGroup.items || [])
                      .slice(0, 3)
                      .map((it: ListeningItem, idx: number) => (
                        <div key={`ans-${it.id}`} className="text-sm">
                          <span className="font-semibold">Q{idx + 1}:</span>
                          <span className="ml-2">
                            正答: {correctMap[it.id] || "-"}
                          </span>
                          <div className="text-slate-600 mt-1">
                            {it.question}
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    スクリプト（全文）
                  </div>
                  <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                    {selectedGroup.dialogText}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
