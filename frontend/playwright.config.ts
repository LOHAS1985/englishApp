import { defineConfig } from "@playwright/test";

const PORT = 5199;

/**
 * 画面の通し確認(e2e)。バックエンドは動かさず、各テストで /api/** を固定データに差し替える(e2e/mockApi.ts)。
 * ブラウザは端末に入っている Chrome を使う(Playwright のブラウザのダウンロードは不要)。
 * 開発サーバーが起動していればそれを使い回すので、2回目以降は起動を待たない。
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/englishApp/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
