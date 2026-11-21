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
  /** 送る内容。clientRequestId(この列の id)と answeredAt(解いた時刻)を含む。サーバーが再送を見分けるのに使う */
  body: unknown;
  /** 出題の選び方に使う解答履歴(新しい順)。送れるまでは履歴にこの分を足して出題する */
  rows: AnswerRow[];
  /** 列に入れた時刻(ms)。古い版が保存した分には無いので、読み込み時に補う */
  createdAt: number;
}

const OUTBOX_KEY = "englishApp.outbox";
const HISTORY_KEY = (feature: PracticeFeature) => `englishApp.history.${feature}`;
/** 履歴は出題の選び方にしか使わないので、古い分は捨てて保存容量を抑える */
const HISTORY_LIMIT = 5000;
/**
 * サーバーが「問題が見つからない」(404)と返しても、この時間は捨てずに再送する。
 * 問題を追加した直後は、画面(GitHub Pages)が先に新しくなり、サーバー(Render)の反映が遅れるため
 */
const NOT_FOUND_RETRY_MS = 24 * 60 * 60 * 1000;

// localStorage が使えない環境(プライベートモード・容量超過)でも動くよう、書き込みに失敗したら以後はメモリの値を正とする
let storageUnusable = false;
let memoryOutbox: OutboxEntry[] = [];
const memoryHistory = new Map<PracticeFeature, AnswerRow[]>();

/** 保存した配列を読む。壊れていて配列でなければ空として扱う(出題が丸ごと止まらないように) */
function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくてもメモリ上の値で動く
  }
}

/** 列の id(`<時刻ms>-<乱数>`)から、列に入れた時刻を取り出す */
function timeOfId(id: string): number | null {
  const ms = Number(id.split("-")[0]);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** 送る内容に、再送を見分ける ID と解いた時刻を付ける(すでに付いていれば何もしない) */
function stamp(body: unknown, id: string, createdAt: number): unknown {
  if (typeof body !== "object" || body === null || "clientRequestId" in body) return body;
  return { ...body, clientRequestId: id, answeredAt: new Date(createdAt).toISOString() };
}

/** 古い版が保存した分に、createdAt・clientRequestId・answeredAt を補う */
function withMeta(entry: OutboxEntry): OutboxEntry {
  const createdAt = entry.createdAt ?? timeOfId(entry.id) ?? Date.now();
  const body = stamp(entry.body, entry.id, createdAt);
  return entry.createdAt === createdAt && body === entry.body ? entry : { ...entry, createdAt, body };
}

/**
 * 送信待ちの列を、毎回ブラウザの保存から読み直す。別のタブが足した・消した分を上書きして失わないため
 * (タブごとのメモリに持つと、古い内容で保存し直してしまう)。
 */
function loadOutbox(): OutboxEntry[] {
  if (storageUnusable) return memoryOutbox;
  let raw: string | null;
  try {
    raw = localStorage.getItem(OUTBOX_KEY);
  } catch {
    storageUnusable = true;
    return memoryOutbox;
  }
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    // 壊れていれば空として扱う
  }
  const stored = Array.isArray(parsed) ? (parsed as OutboxEntry[]) : [];
  const entries = stored.map(withMeta);
  if (entries.some((e, i) => e !== stored[i])) saveOutbox(entries);
  memoryOutbox = entries;
  return entries;
}

function saveOutbox(entries: OutboxEntry[]) {
  memoryOutbox = entries;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    storageUnusable = true;
  }
}

function cachedHistory(feature: PracticeFeature): AnswerRow[] {
  if (!memoryHistory.has(feature)) memoryHistory.set(feature, readArray<AnswerRow>(HISTORY_KEY(feature)));
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

/** 送信待ちの記録が送れた回数。履歴の取得中に送れた分があれば、その取得結果は古いので保存しない */
let sentCount = 0;

/**
 * サーバーの解答履歴を取り直してブラウザに保存する(出題は待たない)。別の端末で解いた分もこれで反映される。
 * 送信待ちの解答がある間は取り直さない(サーバーの履歴に入る前に上書きすると、解いた問題がまた出るため)。
 * 取得の途中で解答が送れたときも、取得結果にその分が入っていないことがあるので保存しない。
 */
export function refreshHistory(feature: PracticeFeature) {
  if (refreshing.has(feature) || loadOutbox().some((e) => e.feature === feature)) return;
  const sentBefore = sentCount;
  const task = send(`/api/practice/history?feature=${feature}`, "履歴の取得に失敗しました")
    .then((res) => res.json() as Promise<AnswerRow[]>)
    .then((rows) => {
      if (sentCount === sentBefore && !loadOutbox().some((e) => e.feature === feature)) saveHistory(feature, rows);
    })
    .catch(() => {
      // 取れなければ前回保存した履歴のまま出題する
    })
    .finally(() => refreshing.delete(feature));
  refreshing.set(feature, task);
}

export function enqueueAnswer(feature: PracticeFeature, path: string, body: unknown, rows: AnswerRow[]) {
  const createdAt = Date.now();
  const id = `${createdAt}-${Math.random().toString(36).slice(2)}`;
  // 送信が遅れても解いた日に数えられ、再送しても二重に記録されないよう、時刻と ID を付けて送る
  saveOutbox([...loadOutbox(), { id, feature, path, body: stamp(body, id, createdAt), rows, createdAt }]);
  void flushOutbox();
}

let flushing: Promise<void> | null = null;

/** 送信待ちの記録を古い順に送る。サーバーが応答しない・落ちているときは、次の機会(画面を開く・オンライン復帰)に再送する */
export function flushOutbox(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    // 「問題が見つからない」で今回は送れなかった分。残しておき、後ろの記録は先に送る(止めない)
    const waiting = new Set<string>();
    for (;;) {
      const entry = loadOutbox().find((e) => !waiting.has(e.id));
      if (!entry) return;
      try {
        await send(entry.path, "記録の保存に失敗しました", jsonBody("POST", entry.body));
      } catch (e) {
        if (e instanceof HttpError && e.status === 404 && Date.now() - entry.createdAt < NOT_FOUND_RETRY_MS) {
          waiting.add(entry.id);
          continue;
        }
        // 400 などは送り直しても通らない(入力の誤りなど)ので捨てる。404 も一定時間たてば捨てる。
        // 401・5xx・通信失敗は残して後で再送
        const permanent = e instanceof HttpError && e.status >= 400 && e.status < 500 && e.status !== 401;
        if (!permanent) return;
      }
      sentCount++;
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
