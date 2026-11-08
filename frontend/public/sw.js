/*
 * 英語学習の Service Worker(ホーム画面に追加した PWA のオフライン閲覧用)。
 *
 * 素の JavaScript のまま public/ に置く(Vite の変換を通さず、そのまま配信するため)。
 * 登録は src/main.tsx で本番のみ行う。vite.config.ts の base を変えたら BASE も変えること。
 *
 * 方針:
 * - 画面の遷移(navigate)は network-first。オンラインなら常に最新の index.html を取り、
 *   取れなかったとき(オフライン)だけキャッシュの index.html を返す。中身は React Router が URL から組み立てる
 * - 同一オリジンの静的アセット(ハッシュ付きの JS/CSS、問題集の JSON など)は cache-first。
 *   ファイル名に内容のハッシュが入っているので、キャッシュから返しても内容がずれない
 * - API(/api/ を含むリクエスト)と別オリジンのリクエストは一切キャッシュしない。
 *   記録・採点は必ずサーバーへ送る(解答記録の送信待ちの列は src/api/outbox.ts が担当する)
 */

const BASE = "/englishApp/";
// キャッシュの世代。この Service Worker の処理内容を変えたら数字を上げる。古い世代は activate で消す
const CACHE_NAME = "englishApp-v1";
// オフラインでも開けるように、install で先に保存する最小限のファイル(app shell)
const SHELL_URLS = [`${BASE}index.html`, `${BASE}manifest.webmanifest`, `${BASE}favicon.svg`];
const SHELL_INDEX = `${BASE}index.html`;

// skipWaiting() と clients.claim() は呼ばない(意図的)。
// 開いている画面は古いビルドの JS を動かしていて、遅延読み込みする chunk を後から取りに行く。
// 新しい Service Worker がすぐ有効になって古いキャッシュを消すと、その画面で chunk の読み込みに失敗する。
// そのため新しい版は、古い版を使っている画面をすべて閉じた次の起動から有効になる。
// (画面を開き直せば index.html は network-first で最新になるので、表示が古いまま残ることはない)

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // HTTP キャッシュの古い版を掴まないよう reload で取り直す
      cache.addAll(SHELL_URLS.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("englishApp-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  // 書き込み系(POST など)は保存の対象外
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // 別オリジン(API サーバーなど)と API は対象外。何もせず通常どおりネットワークへ流す
  if (url.origin !== self.location.origin || url.pathname.includes("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith(`${BASE}assets/`) ||
    pathname.startsWith(`${BASE}generated/`) ||
    pathname === `${BASE}favicon.svg` ||
    pathname === `${BASE}manifest.webmanifest`
  );
}

// 画面の遷移: 取れたらそれを返し、保存しておく。オフラインならキャッシュの index.html を返す
async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    // 404 など失敗の応答は保存しない(保存した index.html が壊れた画面になるのを防ぐ)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(SHELL_INDEX, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(SHELL_INDEX);
    return (
      cached ||
      new Response("オフラインのため表示できません", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

// 静的アセット: 保存済みならそれを返し、無ければ取りに行って保存する
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // 同一オリジンの成功した応答だけ保存する(失敗の応答を保存すると、次回以降もずっと失敗する)
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}
