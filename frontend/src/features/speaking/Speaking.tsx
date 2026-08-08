import React, { useState, useRef, useEffect } from "react";
import { uploadRecording } from "../../api/audio";

export default function Speaking() {
  const [recording, setRecording] = useState<Blob | null>(null);
  const [status, setStatus] = useState("idle");
  const [seconds, setSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    setStatus("starting");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setRecording(blob);
      setStatus("stopped");
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    mr.start();
    mediaRef.current = mr;
    setStatus("recording");
    setSeconds(0);
    intervalRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  };

  const upload = async () => {
    if (!recording) return;
    setStatus("uploading");
    const file = new File([recording], "recording.webm", {
      type: "audio/webm",
    });
    try {
      const res = await uploadRecording(file);
      setStatus(`uploaded id=${res.recordingId}`);
    } catch (e) {
      setStatus("upload failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-md shadow">
        <h2 className="text-2xl font-serif mb-4">Speaking Practice</h2>

        <div className="flex items-center gap-3">
          <button
            onClick={startRecording}
            disabled={status === "recording"}
            className="px-4 py-2 bg-[#8fae4e] text-white rounded-md"
          >
            Start
          </button>

          <button
            onClick={stopRecording}
            disabled={status !== "recording"}
            className="px-4 py-2 bg-slate-200 rounded-md"
          >
            Stop
          </button>

          <button
            onClick={upload}
            disabled={!recording || status === "uploading"}
            className="px-4 py-2 bg-[#16233d] text-white rounded-md"
          >
            Upload
          </button>

          <div className="ml-auto text-sm text-slate-600">Status: {status}</div>
        </div>

        <div className="mt-4">
          <div className="text-sm text-slate-500">Duration: {seconds}s</div>
          {recording && (
            <div className="mt-3">
              <audio controls src={URL.createObjectURL(recording)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
