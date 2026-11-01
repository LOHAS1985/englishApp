import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/englishApp/",
  build: {
    // 同梱の問題集(src/generated/questions/*.json)は機能ごとの別チャンクで、開いた機能の分だけ読み込む。
    // 読解は約1MB(gzip 後 350KB 程度)になるが、ハッシュ付きでキャッシュされるので許容する
    chunkSizeWarningLimit: 1200,
  },
});
