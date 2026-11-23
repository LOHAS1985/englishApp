import { enqueueAnswer, historyRows, refreshHistory, type PracticeFeature } from "./outbox";
import { isChunkLoadError, reloadForStaleChunk } from "../shared/staleChunk";
import { attemptsFromRows, difficultyTarget, pick, type AnswerRow } from "./picker";
import { getJson } from "./http";

/**
 * 画面に同梱した問題集(src/generated/questions/*.json。QuestionExportTests が書き出す)からの出題と採点。
 * サーバーの起動を待たずに問題を出すため、出題・採点は画面で行い、記録だけを裏でサーバーに送る
 * (サーバーは同じ解答 API で採点し直して保存し、学習ログ・復習・レベルに反映する)。
 */

interface Choice {
  label: string;
  text: string;
}

export interface LocalChoiceQuestion {
  id: string;
  sentence: string;
  choices: Choice[];
  answer: string;
  explanation: string;
  translation: string;
  difficulty: number;
}

export interface LocalSetQuestion {
  question: string;
  choices: string[];
  answer: string;
  explanation: string;
}

export interface LocalQuestionSet {
  id: string;
  type: string;
  title: string;
  passage: string | null;
  situation: string | null;
  graphic: string | null;
  script: string | null;
  translation: string | null;
  questions: LocalSetQuestion[];
  difficulty: number;
  theme: string | null;
}

// 文法・語彙は機能ごとに1ファイル、読解・リスニングは形式(type)ごとに1ファイル(別チャンク)にして、
// 開いた形式の分だけ読み込む(読解の TOEIC Part 7 だけで約 580KB。全形式だと 1.3MB を超える)
const choiceLoaders = import.meta.glob<unknown[]>("../generated/questions/*.json", { import: "default" });
const setLoaders = import.meta.glob<unknown[]>("../generated/questions/*/*.json", { import: "default" });
const indexLoader = import.meta.glob<SetIndex>("../generated/questions/index.json", { import: "default" });

/** セット ID → 形式(index.json)。形式を知らずに ID だけで引くとき(採点・台本)に使う */
type SetIndex = Record<SetFeature, Record<string, string>>;

interface Bank<T> {
  all: T[];
  byId: Map<string, T>;
}

const banks = new Map<string, Promise<Bank<{ id: string }>>>();

function toBank<T extends { id: string }>(items: unknown[]): Bank<T> {
  const all = items as T[];
  return { all, byId: new Map(all.map((q) => [q.id, q])) };
}

function cached<T extends { id: string }>(key: string, load: () => Promise<unknown[]>): Promise<Bank<T>> {
  if (!banks.has(key)) {
    // 読み込みに失敗したら次回やり直せるよう、失敗した Promise は残さない
    const promise = load().then((items) => toBank<{ id: string }>(items));
    promise.catch((e) => {
      banks.delete(key);
      // デプロイ後の古い画面では chunk の名前が変わっていて取れない。読み込み直せば最新の画面になる
      if (isChunkLoadError(e)) reloadForStaleChunk();
    });
    banks.set(key, promise);
  }
  return banks.get(key) as Promise<Bank<T>>;
}

function loadChoiceBank<T extends { id: string }>(feature: ChoiceFeature): Promise<Bank<T>> {
  return cached<T>(feature, () => {
    const loader = choiceLoaders[`../generated/questions/${feature}.json`];
    if (!loader) throw new Error(`問題集が見つかりません: ${feature}`);
    return loader();
  });
}

function loadSetBank(feature: SetFeature, type: string): Promise<Bank<LocalQuestionSet>> {
  return cached<LocalQuestionSet>(`${feature}/${type}`, () => {
    const loader = setLoaders[`../generated/questions/${feature}/${type}.json`];
    if (!loader) throw new Error(`この形式の問題はまだ登録されていません: ${type}`);
    return loader();
  });
}

let setIndex: Promise<SetIndex> | null = null;

function loadSetIndex(): Promise<SetIndex> {
  if (!setIndex) {
    const loader = indexLoader["../generated/questions/index.json"];
    setIndex = loader().catch((e) => {
      setIndex = null;
      throw e;
    });
  }
  return setIndex;
}

/** 出題したセットの形式。出題した直後の採点・台本は、index.json を読まずにここから引く */
const typeOfSet = new Map<string, string>();

async function setTypeOf(feature: SetFeature, setId: string): Promise<string | undefined> {
  return typeOfSet.get(setId) ?? (await loadSetIndex())[feature][setId];
}

async function findSet(feature: SetFeature, setId: string): Promise<LocalQuestionSet | undefined> {
  const type = await setTypeOf(feature, setId);
  return type ? (await loadSetBank(feature, type)).byId.get(setId) : undefined;
}

/** 問題集と解答履歴から次の問題を選ぶ。履歴は裏で取り直し、今回は保存済みの履歴で選ぶ(待たない) */
function chooseId<T extends { id: string; difficulty: number }>(
  feature: PracticeFeature,
  candidates: T[],
  exclude: string | null | undefined,
  level: number | undefined,
) {
  refreshHistory(feature);
  const rows = historyRows(feature);
  const pool = level ? candidates.filter((q) => q.difficulty === level) : candidates;
  if (pool.length === 0) throw new Error("この難易度の問題はまだ登録されていません");
  const difficultyOf = new Map(pool.map((q) => [q.id, q.difficulty]));
  const ids = pool.map((q) => q.id);
  const difficulty = (id: string) => difficultyOf.get(id) ?? 2;
  // 難易度を選んだときはその難易度だけから出す。自動のときは直近に解いた問題の難易度と正答率から目標を決める
  const target = level ? null : difficultyTarget(rows, new Set(ids), difficulty);
  return pick(ids, attemptsFromRows(rows), exclude, difficulty, target);
}

// --- 4択短文問題(文法・語彙) ---

type ChoiceFeature = "grammar" | "vocab";

export async function pickChoiceQuestion(feature: ChoiceFeature, exclude?: string | null, level?: number) {
  const bank = await loadChoiceBank<LocalChoiceQuestion>(feature);
  const q = bank.byId.get(chooseId(feature, bank.all, exclude, level));
  if (!q) throw new Error("問題が見つかりません");
  return { id: q.id, sentence: q.sentence, choices: q.choices, difficulty: q.difficulty };
}

/**
 * 画面で採点して結果をすぐ返し、記録は送信待ちの列に入れる。
 * 問題集に無い問題(サーバーの復習モードで出た古い問題など)は null を返すので、呼び出し側がサーバーで採点する。
 */
export async function gradeChoiceQuestion(
  feature: ChoiceFeature,
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  const q = (await loadChoiceBank<LocalChoiceQuestion>(feature)).byId.get(questionId);
  if (!q) return null;
  const correct = q.answer === selectedChoice.trim().toUpperCase();
  enqueueAnswer(feature, `/api/${feature}/answer`, { questionId, selectedChoice, durationSeconds }, [
    { itemId: questionId, questionNo: 1, correct },
  ]);
  return { correct, correctChoice: q.answer, explanation: q.explanation, translation: q.translation };
}

// --- セット問題(読解・リスニング) ---

type SetFeature = "reading" | "listening";

/** 問いかけと選択肢を音声だけで出す形式。解答前は文字を渡さない(サーバーの QuestionSetPractice と同じ) */
const AUDIO_ONLY_TYPES = new Set(["toeic-part2"]);

export async function countSetTypes(feature: SetFeature) {
  const counts: Record<string, number> = {};
  for (const type of Object.values((await loadSetIndex())[feature])) counts[type] = (counts[type] ?? 0) + 1;
  return counts;
}

/**
 * 復習のセット(今日復習する設問を含むセット)。どのセットかはサーバーが決め(間違えた設問の復習日で決まる)、
 * 中身は画面に同梱した問題集から出す
 */
async function pickReviewSet(feature: SetFeature, exclude?: string | null): Promise<LocalQuestionSet> {
  const query = exclude ? `?exclude=${encodeURIComponent(exclude)}` : "";
  const { setId } = await getJson<{ setId: string }>(
    `/api/${feature}/practice/review${query}`,
    "今日の復習の取得に失敗しました",
  );
  const set = await findSet(feature, setId);
  if (!set) throw new Error("問題が見つかりません");
  return set;
}

export async function pickQuestionSet(
  feature: SetFeature,
  type: string,
  exclude?: string | null,
  level?: number,
  review = false,
) {
  let set: LocalQuestionSet | undefined;
  if (review) {
    set = await pickReviewSet(feature, exclude);
  } else {
    const bank = await loadSetBank(feature, type);
    set = bank.byId.get(chooseId(feature, bank.all, exclude, level));
  }
  if (!set) throw new Error("問題が見つかりません");
  typeOfSet.set(set.id, set.type);
  const audioOnly = AUDIO_ONLY_TYPES.has(set.type);
  return {
    id: set.id,
    type: set.type,
    title: set.title,
    passage: set.passage,
    situation: set.situation,
    graphic: set.graphic,
    questions: set.questions.map((q) =>
      audioOnly
        ? { question: "", choices: q.choices.map(() => "") }
        : { question: q.question, choices: q.choices },
    ),
    difficulty: set.difficulty,
    theme: set.theme,
  };
}

export async function gradeQuestionSet(
  feature: SetFeature,
  setId: string,
  answers: string[],
  durationSeconds?: number,
) {
  const set = await findSet(feature, setId);
  if (!set) throw new Error("問題が見つかりません。再度出題してください。");
  const results = set.questions.map((q, i) => {
    const selected = (answers[i] ?? "").trim().toUpperCase();
    return { correct: q.answer === selected, selected, answer: q.answer, explanation: q.explanation };
  });
  // サーバーは設問1から順に保存するので、履歴(新しい順)には最後の設問から入れる
  const rows: AnswerRow[] = results
    .map((r, i) => ({ itemId: setId, questionNo: i + 1, correct: r.correct }))
    .reverse();
  enqueueAnswer(feature, `/api/${feature}/practice/answer`, { setId, answers, durationSeconds }, rows);
  return {
    score: results.filter((r) => r.correct).length,
    total: results.length,
    results,
    script: set.script,
    translation: set.translation,
  };
}

/** ブラウザの読み上げ機能で再生するための台本 */
export async function localScript(setId: string) {
  // 台本は同梱していない(null)ことが多い。形式が引けなくても、呼び出し側がサーバーから取るので null を返す
  return (await findSet("listening", setId).catch(() => undefined))?.script ?? null;
}
