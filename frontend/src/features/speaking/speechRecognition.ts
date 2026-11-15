/**
 * ブラウザの音声認識(Web Speech API)の最小限の型。TypeScript の標準の型には含まれていないため、使う分だけ書く。
 * Chrome / Edge / Safari で使える(Firefox は未対応)。
 */
interface RecognitionResult {
  readonly [index: number]: { readonly transcript: string };
}

interface RecognitionEvent {
  readonly results: ArrayLike<RecognitionResult>;
}

export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionConstructor = new () => Recognition;

export function getRecognitionConstructor(): RecognitionConstructor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * 認識結果のイベントから、ここまでの文字起こし全体を作る。
 * 無音で認識が止まって開始し直すと結果が空から始まるので、前の分を base として足す。
 */
export function joinTranscript(base: string, event: RecognitionEvent): string {
  let text = "";
  for (let i = 0; i < event.results.length; i++) {
    text += `${event.results[i][0].transcript} `;
  }
  return `${base} ${text}`.trim();
}
