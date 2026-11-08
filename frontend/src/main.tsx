import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 本番だけ Service Worker を登録する(ホーム画面に追加した PWA のオフライン閲覧用)。
// 開発サーバーで登録すると、変更したコードが古いキャッシュの画面に隠れてしまうため登録しない。
// 読み込み完了後に登録し、初回の表示と競合させない。登録に失敗してもアプリは通常どおり動く。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // 登録できなくても、オンラインのまま使えれば十分なので何もしない
      })
  })
}
