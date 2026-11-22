import { useCallback, useEffect, useRef, useState } from "react";
import { getRecognitionConstructor, joinTranscript, type Recognition } from "./speechRecognition";

interface Props {
  maxSeconds: number;
  /** 認識できた文字起こし(ここまでの全体)。音声認識に対応していないブラウザでは呼ばれない */
  onTranscript?: (text: string) => void;
  /** 録音を止めたとき(自動停止を含む)。録音した秒数を渡す */
  onStop?: (seconds: number) => void;
}

/** 録音して聞き直すための小さな録音機。録音データはブラウザ内だけで扱う。同時に音声認識で文字起こしする */
export default function Recorder({ maxSeconds, onTranscript, onStop }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  /** マイクの許可を待っている間に再度押されても、録音機を2つ作らない */
  const startingRef = useRef(false);
  const urlRef = useRef<string | null>(null);
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  const stop = useCallback(() => {
    const wasRecording = mediaRef.current !== null;
    mediaRef.current?.stop();
    mediaRef.current = null;
    // onend で開始し直さないよう、先に参照を外してから止める
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (autoStopRef.current) window.clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
    setRecording(false);
    if (wasRecording) {
      onStopRef.current?.(Math.round((Date.now() - startedAtRef.current) / 1000));
    }
  }, []);

  /** 録音の再生用の URL を差し替える。古い URL は解放する(録り直すたびにメモリが残らないように) */
  const replaceUrl = (next: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setUrl(next);
  };

  useEffect(
    () => () => {
      stop();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [stop],
  );

  const startRecognition = () => {
    const Ctor = getRecognitionConstructor();
    if (!Ctor || !onTranscript) return;
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    let base = "";
    let latest = "";
    recognition.onresult = (event) => {
      latest = joinTranscript(base, event);
      onTranscript(latest);
    };
    // 無音が続くと認識だけ止まるので、録音中は開始し直す(それまでの文字起こしは base に残す)
    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;
      base = latest;
      try {
        recognition.start();
      } catch {
        // 開始し直せなければ、そこまでの文字起こしで終える
      }
    };
    recognition.onerror = () => {};
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  };

  const start = async () => {
    if (startingRef.current || mediaRef.current) return;
    startingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        replaceUrl(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType })));
      };
      recorder.start();
      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      replaceUrl(null);
      setSeconds(0);
      setRecording(true);
      onTranscript?.("");
      startRecognition();
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      // 本番の制限時間で自動的に止める
      autoStopRef.current = window.setTimeout(stop, maxSeconds * 1000);
    } catch {
      alert("マイクを使用できません。ブラウザのマイクの許可を確認してください。");
    } finally {
      startingRef.current = false;
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
