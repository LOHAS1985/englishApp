import React, { useState, useRef } from 'react';
import { uploadRecording } from '../../api/audio';

export default function Speaking() {
  const [recording, setRecording] = useState<Blob | null>(null);
  const [status, setStatus] = useState('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);

  const startRecording = async () => {
    setStatus('starting');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      setRecording(blob);
      setStatus('stopped');
    };
    mr.start();
    mediaRef.current = mr;
    setStatus('recording');
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  };

  const upload = async () => {
    if (!recording) return;
    setStatus('uploading');
    const file = new File([recording], 'recording.webm', { type: 'audio/webm' });
    try {
      const res = await uploadRecording(file);
      setStatus(`uploaded id=${res.recordingId}`);
    } catch (e) {
      setStatus('upload failed');
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <h3>Speaking</h3>
      <div>
        <button onClick={startRecording} disabled={status === 'recording'}>Start</button>
        <button onClick={stopRecording} disabled={status !== 'recording'} style={{ marginLeft: 8 }}>Stop</button>
        <button onClick={upload} disabled={!recording || status === 'uploading'} style={{ marginLeft: 8 }}>Upload</button>
      </div>
      <div style={{ marginTop: 12 }}>Status: {status}</div>
      {recording && (
        <audio controls src={URL.createObjectURL(recording)} />
      )}
    </div>
  );
}
