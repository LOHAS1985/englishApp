import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * ビルドした時点のコミット(短いハッシュ)と、その日時。画面の版としてヘッダーに出す(src/shared/buildInfo.ts)。
 * git が使えないとき(CI の一部など)は GITHUB_SHA を使い、日時は空にする。
 */
function readBuildInfo(): { commit: string; date: string } {
  try {
    const [commit = "unknown", date = ""] = execSync("git log -1 --format=%h%n%cI", { encoding: "utf8" })
      .trim()
      .split("\n");
    return { commit, date };
  } catch {
    return { commit: process.env.GITHUB_SHA?.slice(0, 7) ?? "unknown", date: "" };
  }
}

const build = readBuildInfo();

/**
 * 最後に backend/ を変えたコミット(短いハッシュ)。Render はバックエンドに関係する変更のときだけデプロイするので、
 * 画面だけを変えたコミットでは、サーバーはこのコミットのままになる。画面の「サーバーが別の版です」は、
 * サーバーの commit がこれか HEAD のどちらかと同じなら出さない(BuildVersion)。
 * 履歴が浅い clone(CI の既定)では見つからないことがあるので、画面のデプロイは全履歴を取る(frontend-ci-cd.yml)
 */
function readBackendCommit(): string {
  try {
    return execSync("git log -1 --format=%h -- ../backend", { encoding: "utf8" }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}
/** 版の番号(1.2.0 など)。正は package.json の version。変えるときの決まりは CLAUDE.md「バージョン番号」 */
const version = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")).version as string;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/englishApp/",
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_COMMIT__: JSON.stringify(build.commit),
    __APP_BACKEND_COMMIT__: JSON.stringify(readBackendCommit()),
    __APP_COMMIT_DATE__: JSON.stringify(build.date),
  },
  build: {
    // 同梱の問題集(src/generated/questions/*.json)は機能ごとの別チャンクで、開いた機能の分だけ読み込む。
    // 読解は約1MB(gzip 後 350KB 程度)になるが、ハッシュ付きでキャッシュされるので許容する
    chunkSizeWarningLimit: 1200,
  },
  test: {
    // e2e/ は Playwright のテスト。Vitest では動かさない(画面のテストは各ファイルの先頭で jsdom を指定する)
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
