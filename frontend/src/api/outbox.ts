import { HttpError, jsonBody, send } from "./http";
import type { AnswerRow } from "./picker";

/**
 * 解答記録の送信待ちの列。採点は画面ですぐ行い、記録はこの列に入れて裏で送る
 * (サーバーが停止中でも画面を待たせないため)。ブラウザに保存するので、送れないまま画面を閉じても次回に再送する。
 */
export type PracticeFeature = "grammar" | "vocab" | "reading" | "listening";

interface OutboxEntry {
  id: string;
  feature: PracticeFeature;
  path: string;
  body: unknown;
  /** 出題の選び方に使う解答履歴(新しい順)。送れるまでは履歴にこの分を足して出題する */
  rows: AnswerRow[];
}

const OUTBOX_KEY = "englishApp.outbox";
const HISTORY_KEY = (feature: PracticeFeature) => `englishApp.history.${feature}`;
/** 履歴は出題の選び方にしか使わないので、古い分は捨てて保存容量を抑える */
const HISTORY_LIMIT = 5000;

// localStorage が使えない環境(プライベートモードなど)でも動くよう、画面を開いている間はメモリにも持つ
let memoryOutbox: OutboxEntry[] | null = null;
const memoryHistory = new Map<PracticeFeature, AnswerRow[]>();

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくてもメモリ上の値で動く
  }
}

function loadOutbox(): OutboxEntry[] {
  if (memoryOutbox === null) memoryOutbox = readJson<OutboxEntry[]>(OUTBOX_KEY) ?? [];
  return memoryOutbox;
}

function saveOutbox(entries: OutboxEntry[]) {
  memoryOutbox = entries;
  writeJson(OUTBOX_KEY, entries);
}

function cachedHistory(feature: PracticeFeature): AnswerRow[] {
  if (!memoryHistory.has(feature)) memoryHistory.set(feature, readJson<AnswerRow[]>(HISTORY_KEY(feature)) ?? []);
  return memoryHistory.get(feature) ?? [];
}

function saveHistory(feature: PracticeFeature, rows: AnswerRow[]) {
  const trimmed = rows.slice(0, HISTORY_LIMIT);
  memoryHistory.set(feature, trimmed);
  writeJson(HISTORY_KEY(feature), trimmed);
}

/** 出題に使う解答履歴(新しい順)。まだ送れていない解答を先頭に足す */
export function historyRows(feature: PracticeFeature): AnswerRow[] {
  const pending = loadOutbox()
    .filter((e) => e.feature === feature)
    .reverse()
    .flatMap((e) => e.rows);
  return [...pending, ...cachedHistory(feature)];
}

const refreshing = new Map<PracticeFeature, Promise<void>>();

/**
 * サーバーの解答履歴を取り直してブラウザに保存する(出題は待たない)。別の端末で解いた分もこれで反映される。
 * 送信待ちの解答がある間は取り直さない(サーバーの履歴に入る前に上書きすると、解いた問題がまた出るため)。
 */
export function refreshHistory(feature: PracticeFeature) {
  if (refreshing.has(feature) || loadOutbox().some((e) => e.feature === feature)) return;
  const task = send(`/api/practice/history?feature=${feature}`, "履歴の取得に失敗しました")
    .then((res) => res.json() as Promise<AnswerRow[]>)
    .then((rows) => saveHistory(feature, rows))
    .catch(() => {
      // 取れなければ前回保存した履歴のまま出題する
    })
    .finally(() => refreshing.delete(feature));
  refreshing.set(feature, task);
}

export function enqueueAnswer(feature: PracticeFeature, path: string, body: unknown, rows: AnswerRow[]) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  saveOutbox([...loadOutbox(), { id, feature, path, body, rows }]);
  void flushOutbox();
}

let flushing: Promise<void> | null = null;

/** 送信待ちの記録を古い順に送る。サーバーが応答しない・落ちているときは、次の機会(画面を開く・オンライン復帰)に再送する */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    for (;;) {
      const entry = loadOutbox()[0];
      if (!entry) return;
      try {
        await send(entry.path, "記録の保存に失敗しました", jsonBody("POST", entry.body));
      } catch (e) {
        // 400 などは送り直しても通らない(問題集から消えた問題など)ので捨てる。401・5xx・通信失敗は残して後で再送
        const permanent = e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 401;
        if (!permanent) return;
      }
      // 送れた分はサーバーの履歴に入ったので、保存済みの履歴の先頭に移す
      saveHistory(entry.feature, [...entry.rows, ...cachedHistory(entry.feature)]);
      saveOutbox(loadOutbox().filter((e) => e.id !== entry.id));
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function pendingCount() {
  return loadOutbox().length;
}
