import { enqueueAnswer, historyRows, refreshHistory, type PracticeFeature } from "./outbox";
import { attemptsFromRows, difficultyTarget, pick, type AnswerRow } from "./picker";

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

// 機能ごとに別ファイル(別チャンク)にして、開いた機能の問題集だけを読み込む
const loaders = import.meta.glob<unknown[]>("../generated/questions/*.json", { import: "default" });

interface Bank<T> {
  all: T[];
  byId: Map<string, T>;
}

const banks = new Map<string, Promise<Bank<unknown>>>();

function loadBank<T extends { id: string }>(feature: PracticeFeature): Promise<Bank<T>> {
  if (!banks.has(feature)) {
    const loader = loaders[`../generated/questions/${feature}.json`];
    if (!loader) throw new Error(`問題集が見つかりません: ${feature}`);
    banks.set(
      feature,
      loader().then((items) => {
        const all = items as T[];
        return { all, byId: new Map(all.map((q) => [q.id, q])) } as Bank<unknown>;
      }),
    );
  }
  return banks.get(feature) as Promise<Bank<T>>;
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
  // 難易度を選んだときはその難易度だけから出す。自動のときは直近の正答率から目標を決める
  const target = level ? null : difficultyTarget(rows, new Set(ids));
  return pick(ids, attemptsFromRows(rows), exclude, (id) => difficultyOf.get(id) ?? 2, target);
}

// --- 4択短文問題(文法・語彙) ---

type ChoiceFeature = "grammar" | "vocab";

export async function pickChoiceQuestion(feature: ChoiceFeature, exclude?: string | null, level?: number) {
  const bank = await loadBank<LocalChoiceQuestion>(feature);
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
  const q = (await loadBank<LocalChoiceQuestion>(feature)).byId.get(questionId);
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
  for (const s of (await loadBank<LocalQuestionSet>(feature)).all) counts[s.type] = (counts[s.type] ?? 0) + 1;
  return counts;
}

export async function pickQuestionSet(feature: SetFeature, type: string, exclude?: string | null, level?: number) {
  const bank = await loadBank<LocalQuestionSet>(feature);
  const candidates = bank.all.filter((s) => s.type === type);
  if (candidates.length === 0) throw new Error(`この形式の問題はまだ登録されていません: ${type}`);
  const set = bank.byId.get(chooseId(feature, candidates, exclude, level));
  if (!set) throw new Error("問題が見つかりません");
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

/**
 * @param readingSeconds 読解速度の計測で「本文を読み終えるまで」の秒数(計測していなければ省く)
 */
export async function gradeQuestionSet(
  feature: SetFeature,
  setId: string,
  answers: string[],
  durationSeconds?: number,
  readingSeconds?: number,
) {
  const set = (await loadBank<LocalQuestionSet>(feature)).byId.get(setId);
  if (!set) throw new Error("問題が見つかりません。再度出題してください。");
  const results = set.questions.map((q, i) => {
    const selected = (answers[i] ?? "").trim().toUpperCase();
    return { correct: q.answer === selected, selected, answer: q.answer, explanation: q.explanation };
  });
  // サーバーは設問1から順に保存するので、履歴(新しい順)には最後の設問から入れる
  const rows: AnswerRow[] = results
    .map((r, i) => ({ itemId: setId, questionNo: i + 1, correct: r.correct }))
    .reverse();
  enqueueAnswer(feature, `/api/${feature}/practice/answer`, { setId, answers, durationSeconds, readingSeconds }, rows);
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
  return (await loadBank<LocalQuestionSet>("listening")).byId.get(setId)?.script ?? null;
}
