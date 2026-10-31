import { useCallback, useEffect, useRef, useState } from "react";
import { completeSpeakingSet, fetchSpeakingSet, type SpeakingSet } from "../../api/client";
import Header from "../../shared/components/Header";

/** 録音して聞き直すための小さな録音機。録音データはブラウザ内だけで扱う */
function Recorder({ maxSeconds }: { maxSeconds: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    mediaRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
    setRecording(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
      };
      recorder.start();
      mediaRef.current = recorder;
      setUrl(null);
      setSeconds(0);
      setRecording(true);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      // 本番の制限時間で自動的に止める
      autoStopRef.current = window.setTimeout(stop, maxSeconds * 1000);
    } catch {
      alert("マイクを使用できません。ブラウザのマイクの許可を確認してください。");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={recording ? stop : start}
        className={`text-sm font-semibold text-white rounded px-4 py-2 ${
          recording ? "bg-[#c0392b]" : "bg-[#8fae4e] hover:bg-[#7a9843]"
        }`}
      >
        {recording ? `■ 録音停止 (${seconds}/${maxSeconds}秒)` : url ? "● 録り直す" : "● 録音開始"}
      </button>
      {url && <audio controls src={url} className="max-w-full" />}
    </div>
  );
}

/** 質問文を読み上げる(本番では面接委員が読み上げるため) */
function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export default function Speaking() {
  const [set, setSet] = useState<SpeakingSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [prepLeft, setPrepLeft] = useState<number | null>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  // 「次の問題」で表示中のセットが選ばれないよう、表示中の ID を覚えておく
  const currentIdRef = useRef<string | null>(null);
  // 学習ログ用。最初に模範解答を見た時点で、そのセットに取り組んだものとして記録する
  const shownAtRef = useRef(0);
  const loggedRef = useRef(false);
  useEffect(() => {
    currentIdRef.current = set?.id ?? null;
    shownAtRef.current = Date.now();
    loggedRef.current = false;
  }, [set]);

  const load = useCallback(async () => {
    setLoading(true);
    setShown({});
    setPrepLeft(null);
    try {
      setSet(await fetchSpeakingSet(currentIdRef.current));
    } catch {
      setSet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSpeakingSet()
      .then((data) => !cancelled && setSet(data))
      .catch(() => !cancelled && setSet(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (prepLeft === null || prepLeft <= 0) return;
    const id = window.setTimeout(() => setPrepLeft((s) => (s ?? 0) - 1), 1000);
    return () => window.clearTimeout(id);
  }, [prepLeft]);

  const toggle = (key: string) => {
    if (set && !loggedRef.current) {
      loggedRef.current = true;
      completeSpeakingSet(set.id, Math.round((Date.now() - shownAtRef.current) / 1000)).catch(() => {});
    }
    setShown((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <Header />
      <div className="flex justify-center px-4 py-8 sm:px-5 sm:py-12">
        <div className="w-full max-w-[760px] bg-white border border-slate-200 rounded-md p-5 sm:p-8">
          <p className="font-mono text-xs font-semibold tracking-widest text-slate-400 mb-2">
            SPEAKING
          </p>
          <h1 className="font-serif text-2xl text-slate-900 mb-2">英検準1級 二次試験(面接)練習</h1>
          <p className="text-sm text-slate-500 mb-6">
            4コマのイラストの代わりに、各コマの場面を文章で示しています。録音して聞き直し、模範解答と比べてみましょう。
          </p>

          {loading && <p className="text-sm text-slate-400">読み込み中…</p>}
          {!loading && !set && <p className="text-sm text-[#c0392b]">問題の取得に失敗しました。</p>}

          {!loading && set && (
            <div className="space-y-6">
              <section className="border border-slate-200 rounded-md p-4">
                <h2 className="font-serif text-lg text-slate-900 mb-2">{set.title}</h2>
                <p className="text-sm text-slate-600 mb-3">{set.instruction}</p>
                <p className="text-sm text-slate-900 bg-amber-50 border border-amber-200 rounded p-3 mb-4">
                  書き出し: <span className="font-serif">{set.firstSentence}</span>
                </p>
                <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {set.scenes.map((scene, i) => (
                    <li key={i} className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 leading-relaxed">
                      {scene}
                    </li>
                  ))}
                </ol>
              </section>

              <section className="border border-slate-200 rounded-md p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">No.1 ナレーション(2分)</h3>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => setPrepLeft(60)}
                    className="text-sm border border-slate-300 rounded px-3 py-1.5 hover:border-[#16233d]"
                  >
                    準備時間 1分を計る
                  </button>
                  {prepLeft !== null && (
                    <span className={`font-mono text-sm ${prepLeft === 0 ? "text-[#c0392b]" : "text-slate-600"}`}>
                      {prepLeft === 0 ? "準備終了。話し始めてください" : `残り ${prepLeft} 秒`}
                    </span>
                  )}
                </div>
                <Recorder maxSeconds={120} />
                <button onClick={() => toggle("narration")} className="mt-3 text-sm text-[#2463a8] underline">
                  {shown.narration ? "模範解答を隠す" : "模範解答を見る"}
                </button>
                {shown.narration && (
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed bg-slate-50 rounded p-3">
                    {set.narrationSample}
                  </p>
                )}
              </section>

              {set.questions.map((q) => (
                <section key={q.no} className="border border-slate-200 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">No.{q.no}</h3>
                  <div className="flex items-start gap-2 mb-3">
                    <button
                      onClick={() => speak(q.question)}
                      className="shrink-0 text-xs border border-slate-300 rounded px-2 py-1 hover:border-[#16233d]"
                      aria-label="質問を読み上げる"
                    >
                      🔊
                    </button>
                    <p className="text-sm text-slate-800 font-serif leading-relaxed">{q.question}</p>
                  </div>
                  <Recorder maxSeconds={60} />
                  <button onClick={() => toggle(`q${q.no}`)} className="mt-3 text-sm text-[#2463a8] underline">
                    {shown[`q${q.no}`] ? "模範解答を隠す" : "模範解答を見る"}
                  </button>
                  {shown[`q${q.no}`] && (
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed bg-slate-50 rounded p-3">
                      {q.sampleAnswer}
                    </p>
                  )}
                </section>
              ))}

              <button
                onClick={load}
                className="text-sm font-semibold text-white bg-[#16233d] rounded px-5 py-3 hover:bg-[#23365c] transition-colors"
              >
                次の問題
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
