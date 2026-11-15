import type { Page } from "@playwright/test";

/**
 * バックエンドの代わりに /api/** を固定データで返す。サーバーの起動待ちも端末登録も要らない。
 * キーは "メソッド パス"(例: "POST /api/speaking/score")。値は返す JSON。
 * 定義していない GET は 404、定義していない POST などは空のオブジェクトで成功させる(解答の送信待ちなど)。
 */
export async function mockApi(page: Page, handlers: Record<string, unknown> = {}) {
  // 画面の読み込み(/englishApp/src/api/... のモジュール)を巻き込まないよう、パスの先頭が /api/ のものだけを対象にする
  await page.route(
    (url) => url.pathname === "/health",
    (route) => route.fulfill({ status: 200, body: "ok" }),
  );
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    (route) => {
      const request = route.request();
      const key = `${request.method()} ${new URL(request.url()).pathname}`;
      if (key in handlers) return route.fulfill({ json: handlers[key] });
      if (request.method() === "GET") return route.fulfill({ status: 404, json: { message: "mock: 未定義" } });
      return route.fulfill({ json: {} });
    },
  );
}

/** 画面ごとの固定データ */
export const FIXTURES = {
  writingQuestion: {
    id: "w9999",
    type: "opinion",
    prompt: "Write an essay on the given TOPIC.",
    topic: "Should cities ban cars from their centers?",
    points: ["Cost", "Health", "Safety", "Convenience"],
    passage: null,
    minWords: 120,
    maxWords: 150,
    theme: "環境・エネルギー",
  },
  speakingSet: {
    id: "s9999",
    title: "A Day at the Park",
    instruction: "Tell the story in the four pictures.",
    firstSentence: "One sunny morning, a family went to the park.",
    scenes: ["Scene 1", "Scene 2", "Scene 3", "Scene 4"],
    narrationSample: "One sunny morning, a family went to the park...",
    questions: [
      { no: 2, question: "Question two?", sampleAnswer: "Answer two." },
      { no: 3, question: "Question three?", sampleAnswer: "Answer three." },
      { no: 4, question: "Question four?", sampleAnswer: "Answer four." },
    ],
  },
  speakingScore: {
    content: { score: 3, feedback: "内容はおおむね良いです。" },
    structure: { score: 3, feedback: "構成は自然です。" },
    vocabulary: { score: 3, feedback: "語彙は適切です。" },
    grammar: { score: 3, feedback: "文法は正確です。" },
    betterAnswer: "One sunny morning, a family went to the park.",
    total: 12,
  },
  mockExam: {
    sections: [
      {
        skill: "listening",
        minutes: 45,
        items: [
          {
            feature: "listening",
            id: "l9999",
            type: "toeic-part3",
            title: null,
            passage: null,
            situation: null,
            graphic: null,
            questions: [{ question: "What are they discussing?", choices: ["A plan", "A menu", "A price", "A map"] }],
          },
        ],
      },
      {
        skill: "reading",
        minutes: 75,
        items: [
          {
            feature: "grammar",
            id: "g9999",
            type: "toeic-part5",
            title: null,
            passage: null,
            situation: null,
            graphic: null,
            questions: [{ question: "She ____ to work.", choices: ["go", "goes", "going", "gone"] }],
          },
        ],
      },
    ],
  },
} as const;
