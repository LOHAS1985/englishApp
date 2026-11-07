import {
  API_BASE,
  errorMessage,
  getJson,
  jsonBody,
  postJson,
  send,
} from "./http";

import {
  countSetTypes,
  gradeChoiceQuestion,
  gradeQuestionSet,
  localScript,
  pickChoiceQuestion,
  pickQuestionSet,
} from "./localQuestions";

export { DEVICE_REGISTRATION_REQUIRED_EVENT, hasDeviceToken, saveDeviceToken } from "./http";
export { flushOutbox, pendingCount } from "./outbox";

/** 画面に表示中の問題を exclude で渡し、次の問題(先読み)で同じ問題が選ばれないようにする */
const excludeParam = (exclude?: string | null) =>
  exclude ? `exclude=${encodeURIComponent(exclude)}` : "";

/** Render の無料枠はスリープするので、画面を開いた時点で起こしておく(失敗は無視) */
export function wakeUpServer() {
  fetch(`${API_BASE}/health`).catch(() => {});
}

export type WritingType = "opinion" | "summary";

export interface WritingQuestion {
  id: string;
  type: WritingType;
  prompt: string;
  topic: string;
  points: string[];
  passage: string | null;
  minWords: number;
  maxWords: number;
  /** 話題(社会・政治、環境・エネルギーなど) */
  theme: string | null;
}

export async function fetchWritingQuestion(type: WritingType, exclude?: string | null) {
  return getJson<WritingQuestion>(
    `/api/writing/question?type=${type}&${excludeParam(exclude)}`,
    "お題の取得に失敗しました",
  );
}

export interface CriterionScore {
  score: number;
  feedback: string;
}

export interface ScoreResult {
  content: CriterionScore;
  structure: CriterionScore;
  vocabulary: CriterionScore;
  grammar: CriterionScore;
  total: number;
}

export async function scoreWritingAnswer(
  questionId: string,
  answer: string,
  durationSeconds?: number,
) {
  return postJson<ScoreResult>(
    "/api/writing/score",
    { questionId, answer, durationSeconds },
    "採点に失敗しました",
  );
}

export interface WritingHistoryItem {
  id: number;
  topic: string;
  points: string[];
  answer: string;
  wordCount: number;
  contentScore: number;
  contentFeedback: string;
  structureScore: number;
  structureFeedback: string;
  vocabularyScore: number;
  vocabularyFeedback: string;
  grammarScore: number;
  grammarFeedback: string;
  totalScore: number;
  createdAt: string;
}

export async function fetchWritingHistory() {
  return getJson<WritingHistoryItem[]>("/api/writing/history", "履歴の取得に失敗しました");
}

export interface GrammarChoice {
  label: string;
  text: string;
}

export interface GrammarQuestion {
  id: string;
  sentence: string;
  choices: GrammarChoice[];
  /** 1=基礎 / 2=標準 / 3=発展 */
  difficulty: number;
}

/** level(1〜3)を省略すると、サーバーが直近の正答率に合わせて難易度を選ぶ */
const levelParam = (level?: number) => (level ? `&level=${level}` : "");

export interface GrammarAnswerResult {
  correct: boolean;
  correctChoice: string;
  explanation: string;
  translation: string;
}

/**
 * 通常の出題は画面に同梱した問題集から選ぶ(サーバーの起動を待たない)。
 * review: true のときだけ、復習日の管理(review_items)を持つサーバーに問い合わせる
 * (無ければエラー「今日の復習はすべて終わりました」)。
 */
async function fetchChoiceQuestion(
  feature: "grammar" | "vocab",
  exclude: string | null | undefined,
  review: boolean,
  level: number | undefined,
) {
  if (!review) return pickChoiceQuestion(feature, exclude, level);
  return getJson<GrammarQuestion>(
    `/api/${feature}/question?review=true&${excludeParam(exclude)}${levelParam(level)}`,
    "問題の取得に失敗しました",
  );
}

/** 画面で採点してすぐ結果を返し、記録は裏でサーバーに送る(問題集に無い問題だけサーバーで採点) */
async function submitChoiceAnswer(
  feature: "grammar" | "vocab",
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  const local = await gradeChoiceQuestion(feature, questionId, selectedChoice, durationSeconds);
  if (local) return local;
  return postJson<GrammarAnswerResult>(
    `/api/${feature}/answer`,
    { questionId, selectedChoice, durationSeconds },
    "採点に失敗しました",
  );
}

export async function fetchGrammarQuestion(exclude?: string | null, review = false, level?: number) {
  return fetchChoiceQuestion("grammar", exclude, review, level);
}

export async function submitGrammarAnswer(
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  return submitChoiceAnswer("grammar", questionId, selectedChoice, durationSeconds);
}

// 語彙問題(形は文法問題と同じ)
export async function fetchVocabQuestion(exclude?: string | null, review = false, level?: number) {
  return fetchChoiceQuestion("vocab", exclude, review, level);
}

export async function submitVocabAnswer(
  questionId: string,
  selectedChoice: string,
  durationSeconds?: number,
) {
  return submitChoiceAnswer("vocab", questionId, selectedChoice, durationSeconds);
}

export interface GrammarHistoryItem {
  id: number;
  sentence: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctChoice: string;
  selectedChoice: string;
  correct: boolean;
  explanation: string;
  translation: string;
  createdAt: string;
}

export async function fetchGrammarHistory() {
  return getJson<GrammarHistoryItem[]>("/api/grammar/history", "履歴の取得に失敗しました");
}

export interface ArticleSummary {
  id: string;
  title: string;
  section: string;
  thumbnail: string | null;
  publishedDate: string;
}

export interface VocabularyItem {
  word: string;
  meaning: string;
  example: string;
}

export interface ArticleDetail {
  id: string;
  title: string;
  byline: string | null;
  body: string;
  webUrl: string;
  publishedDate: string;
  summary: string;
  vocabulary: VocabularyItem[];
}

export async function fetchArticles(query?: string, page = 1) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  params.set("page", String(page));
  return getJson<ArticleSummary[]>(`/api/reading/articles?${params}`, "記事の取得に失敗しました");
}

export async function fetchArticleDetail(id: string) {
  const params = new URLSearchParams({ id });
  return getJson<ArticleDetail>(`/api/reading/article?${params}`, "記事の取得に失敗しました");
}

export interface ReadingRecordResult {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
}

export async function recordReading(
  articleId: string,
  articleTitle: string,
  wordCount: number,
  durationSeconds: number,
) {
  return postJson<ReadingRecordResult>(
    "/api/reading/record",
    { articleId, articleTitle, wordCount, durationSeconds },
    "記録の保存に失敗しました",
  );
}

// セット問題(読解・リスニング):文章や音声1つに複数の設問が付く
export interface SetQuestionView {
  question: string;
  choices: string[];
}

export interface QuestionSetView {
  id: string;
  type: string;
  title: string;
  passage: string | null;
  situation: string | null;
  /** TOEIC Part 3/4 の図表問題で見る表・図。等幅フォントで表示する */
  graphic: string | null;
  questions: SetQuestionView[];
  /** 1=基礎 / 2=標準 / 3=発展 */
  difficulty: number;
  /** 話題(英検の長文・説明文のみ) */
  theme: string | null;
}

export interface SetQuestionResult {
  correct: boolean;
  selected: string;
  answer: string;
  explanation: string;
}

export interface SetAnswerResult {
  score: number;
  total: number;
  results: SetQuestionResult[];
  script: string | null;
  translation: string | null;
}

type PracticeFeature = "reading" | "listening";

// セット問題も画面に同梱した問題集から出題・採点し、記録は裏でサーバーに送る
export async function fetchPracticeTypes(feature: PracticeFeature): Promise<Record<string, number>> {
  return countSetTypes(feature);
}

export async function fetchPracticeSet(
  feature: PracticeFeature,
  type: string,
  exclude?: string | null,
  level?: number,
): Promise<QuestionSetView> {
  return pickQuestionSet(feature, type, exclude, level);
}

export async function submitPracticeAnswers(
  feature: PracticeFeature,
  setId: string,
  answers: string[],
  durationSeconds?: number,
): Promise<SetAnswerResult> {
  const graded = await gradeQuestionSet(feature, setId, answers, durationSeconds);
  if (feature !== "listening") return graded;
  // リスニングの台本と和訳は画面に同梱していないので、解答後にサーバーから取る(取れなくても採点結果は出す)
  const reveal = await fetchListeningReveal(setId).catch(() => null);
  return { ...graded, script: reveal?.script ?? null, translation: reveal?.translation ?? null };
}

/** サーバーで台本を音声化する。結果は1ファイル(audioUrl)か行ごと(audioUrls) */
export async function synthesizeListeningAudio(setId: string) {
  return getJson<{ audioUrl?: string; audioUrls?: string[] }>(
    `/api/listening/practice/${setId}/audio`,
    "音声の生成に失敗しました",
    { method: "POST" },
  );
}

/** 解答後に見せる台本と和訳(リスニングは問題集に同梱していない) */
export async function fetchListeningReveal(setId: string) {
  return getJson<{ script: string | null; translation: string | null }>(
    `/api/listening/practice/${setId}/reveal`,
    "台本の取得に失敗しました",
  );
}

/** ブラウザの読み上げ機能で再生するための台本(画面には表示しない)。音声は解答の前に聞くので、解答前にもサーバーから取る */
export async function fetchListeningScript(setId: string) {
  const script = await localScript(setId);
  if (script) return script;
  const body = await getJson<{ script: string }>(
    `/api/listening/practice/${setId}/script`,
    "台本の取得に失敗しました",
  );
  return body.script;
}

export function toAbsoluteApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${String(API_BASE ?? "").replace(/\/$/, "")}${encodeURI(path)}`;
}

// スピーキング(英検二次の面接形式)
export interface InterviewQuestion {
  no: number;
  question: string;
  sampleAnswer: string;
}

export interface SpeakingSet {
  id: string;
  title: string;
  instruction: string;
  firstSentence: string;
  scenes: string[];
  narrationSample: string;
  questions: InterviewQuestion[];
}

export async function fetchSpeakingSet(exclude?: string | null) {
  return getJson<SpeakingSet>(
    `/api/speaking/question?${excludeParam(exclude)}`,
    "問題の取得に失敗しました",
  );
}

/** 1セット取り組んだ(模範解答を見た)ことを学習ログに残す */
export async function completeSpeakingSet(setId: string, durationSeconds: number) {
  await send("/api/speaking/complete", "記録の保存に失敗しました", jsonBody("POST", { setId, durationSeconds }));
}

// 学習ログの集計と復習(間隔反復)
export type Skill = "listening" | "reading" | "writing" | "speaking" | "vocab";

export interface StudyTotals {
  sessions: number;
  seconds: number;
  correct: number;
  total: number;
}

export interface ReviewSummary {
  feature: "vocab" | "grammar";
  due: number;
  pending: number;
}

export interface StatsSummary {
  today: StudyTotals;
  skills: { skill: Skill; week: StudyTotals; month: StudyTotals }[];
  types: { type: string; month: StudyTotals }[];
  daily: { date: string; seconds: Record<Skill, number> }[];
  review: Record<string, ReviewSummary>;
}

export interface StudyLogItem {
  id: number;
  feature: string;
  type: string;
  itemId: string | null;
  correct: number | null;
  total: number | null;
  durationSeconds: number;
  createdAt: string;
}

export async function fetchStatsSummary() {
  return getJson<StatsSummary>("/api/stats/summary", "学習記録の取得に失敗しました");
}

export async function fetchStudyHistory() {
  return getJson<StudyLogItem[]>("/api/stats/history", "履歴の取得に失敗しました");
}

/** 文法の分野・語彙の品詞・読解/リスニングの設問タイプ別の成績(全期間) */
export interface WeaknessItem {
  feature: "grammar" | "vocab" | "reading" | "listening";
  type: string;
  category: string;
  correct: number;
  total: number;
}

export async function fetchWeakness() {
  return getJson<WeaknessItem[]>("/api/stats/weakness", "弱点分析の取得に失敗しました");
}

// レベル(経験値)と、期限(2027年3月末に Lv.100)までの学習ペース
export interface LevelSummary {
  level: number;
  maxLevel: number;
  totalXp: number;
  /** 今のレベルに上がった累計経験値 */
  levelStartXp: number;
  /** 次のレベルに必要な累計経験値(Lv.100 なら null) */
  nextLevelXp: number | null;
  /** 今日の内訳。total = (answers + time + bonus) × multiplier */
  today: {
    total: number;
    answers: number;
    time: number;
    bonus: number;
    multiplier: number;
    minutes: number;
    skills: number;
  };
  streakDays: number;
  dailyTargetXp: number;
  /** 予定どおりなら今日の始まりに持っているはずの累計経験値 */
  expectedXp: number;
  expectedLevel: number;
  pace: "ahead" | "onTrack" | "behind";
  xpPerDayToGoal: number;
  daysLeft: number;
  goalDate: string;
  recentDays: { date: string; xp: number }[];
}

export async function fetchLevel() {
  return getJson<LevelSummary>("/api/level", "レベルの取得に失敗しました");
}

export async function fetchReviewSummary() {
  return getJson<Record<string, ReviewSummary>>("/api/review/summary", "復習の件数の取得に失敗しました");
}

// 管理画面(単語の登録・編集)
export interface AdminWord {
  id: number;
  word: string;
  meaningEn: string;
  exampleEn: string;
  meaningJa: string;
  exampleJa: string;
  createdAt: string;
}

export type AdminWordForm = Pick<
  AdminWord,
  "word" | "meaningEn" | "exampleEn" | "meaningJa" | "exampleJa"
>;

/** meaningEn / exampleEn を省略すると、サーバーが辞書から補う */
export async function createAdminWord(input: {
  word: string;
  meaningEn?: string;
  exampleEn?: string;
}) {
  return postJson<AdminWord>("/api/admin/words", input, "登録に失敗しました");
}

export async function fetchAdminWords() {
  return getJson<AdminWord[]>("/api/admin/words", "単語一覧の取得に失敗しました");
}

export async function updateAdminWord(id: number, form: AdminWordForm) {
  return getJson<AdminWord>(`/api/admin/words/${id}`, "更新に失敗しました", jsonBody("PUT", form));
}

export async function deleteAdminWord(id: number) {
  await send(`/api/admin/words/${id}`, "削除に失敗しました", { method: "DELETE" });
}

// アクセス履歴(閲覧キーが必要。キーはサーバーの環境変数 ACCESS_LOG_KEY と同じ値)
export interface AccessIpSummary {
  ip: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  devices: string;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
}

export interface AccessLogItem {
  createdAt: string;
  ip: string;
  method: string;
  path: string;
  device: string;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
}

export interface AccessLogResponse {
  days: number;
  total: number;
  summaries: AccessIpSummary[];
  recent: AccessLogItem[];
}

export class AccessLogKeyError extends Error {}

export async function fetchAccessLogs(key: string, days: number) {
  const res = await fetch(`${API_BASE}/api/access-logs?days=${days}`, {
    headers: { "X-Access-Log-Key": key },
  });
  if (res.status === 403) {
    throw new AccessLogKeyError(await errorMessage(res, "閲覧キーが違います"));
  }
  if (!res.ok) throw new Error("アクセス履歴の取得に失敗しました");
  return res.json() as Promise<AccessLogResponse>;
}

// 端末登録(この API を使えるのは登録済みの端末だけ。最大3台)
export interface DeviceView {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** この端末なら true */
  current: boolean;
}

/** 合言葉(サーバーの APP_ACCESS_KEY)で、この端末を登録する。発行された鍵は呼び出し側が saveDeviceToken で保存する */
export async function registerDevice(key: string, name: string) {
  return postJson<{ token: string; device: DeviceView }>(
    "/api/devices/register",
    { key, name },
    "端末の登録に失敗しました",
  );
}

export async function fetchDevices() {
  return getJson<DeviceView[]>("/api/devices", "端末の一覧の取得に失敗しました");
}

export async function deleteDevice(id: number) {
  await send(`/api/devices/${id}`, "端末の削除に失敗しました", { method: "DELETE" });
}
