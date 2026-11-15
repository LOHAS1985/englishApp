import type { MockExamView } from "../../api/client";

/**
 * 模試の途中経過。画面を誤って閉じたりリロードしたりしても、続きから再開できるようにブラウザへ保存する。
 * 区切りの開始時刻も保存するので、再開しても本番と同じく時間は進み続ける(時間が切れていれば次へ進む)。
 */
export interface MockSession {
  version: 1;
  savedAt: number;
  phase: "listening" | "reading";
  exam: MockExamView;
  /** 問題ごとの答え。キーは itemKey、値は設問ごとの記号(未解答は空) */
  answers: Record<string, string[]>;
  listeningIndex: number;
  /** いまの区切りを始めた時刻 */
  sectionStart: number;
  /** 終えたリスニングの使った秒数(まだなら 0) */
  listeningSeconds: number;
}

const STORAGE_KEY = "mockSession";

/** 模試(リスニング45分+リーディング75分)を通しても超えない余裕を持たせた期限 */
export const MOCK_SESSION_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/** 保存された文字列から途中経過を読む。壊れている・形が違う・古いときは null */
export function parseMockSession(raw: string | null, now: number): MockSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const s = value as Partial<MockSession>;
    if (s.version !== 1 || typeof s.savedAt !== "number") return null;
    if (now - s.savedAt > MOCK_SESSION_MAX_AGE_MS) return null;
    if (s.phase !== "listening" && s.phase !== "reading") return null;
    if (typeof s.listeningIndex !== "number" || typeof s.sectionStart !== "number") return null;
    if (typeof s.listeningSeconds !== "number") return null;
    if (typeof s.answers !== "object" || s.answers === null) return null;
    if (typeof s.exam !== "object" || s.exam === null || !Array.isArray(s.exam.sections)) return null;
    return s as MockSession;
  } catch {
    return null;
  }
}

export function loadMockSession(): MockSession | null {
  try {
    return parseMockSession(localStorage.getItem(STORAGE_KEY), Date.now());
  } catch {
    return null;
  }
}

export function saveMockSession(session: Omit<MockSession, "version" | "savedAt">) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, version: 1, savedAt: Date.now() }));
  } catch {
    // 容量などで保存できなくても、模試そのものは続けられる
  }
}

export function clearMockSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、期限で捨てられる
  }
}
