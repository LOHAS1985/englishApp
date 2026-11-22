import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { flushOutbox } from "./api/client";
import Home from "./pages/Home";
import Grammar from "./features/grammar/Grammar";
import Listening from "./features/listening/Listening";
import Vocab from "./features/vocab/Vocab";
import ReadingPractice from "./features/reading/ReadingPractice";
import DeviceGate from "./features/device/DeviceGate";
import StatusNotice from "./shared/components/StatusNotice";

// 使う頻度の低い画面は、開いたときに読み込む(最初に読み込む量を減らす)
const Writing = lazy(() => import("./features/writing/Writing"));
const Speaking = lazy(() => import("./features/speaking/Speaking"));
const Admin = lazy(() => import("./pages/Admin"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Mock = lazy(() => import("./features/mock/Mock"));
const Wordbook = lazy(() => import("./features/wordbook/Wordbook"));
const WordbookQuiz = lazy(() => import("./features/wordbook/WordbookQuiz"));
const WordbookList = lazy(() => import("./features/wordbook/WordbookList"));

export default function App() {
  // 前回送れなかった解答記録を送る。オンラインに戻ったとき・画面に戻ってきたときにも再送する
  useEffect(() => {
    const flush = () => void flushOutbox();
    const onVisible = () => document.visibilityState === "visible" && flush();
    flush();
    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <BrowserRouter basename="/englishApp">
      <DeviceGate />
      <StatusNotice />
      <Suspense fallback={<p className="p-6 text-sm text-slate-400">読み込み中…</p>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/reading/practice" element={<ReadingPractice />} />
        <Route path="/vocab" element={<Vocab />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/mock" element={<Mock />} />
        <Route path="/wordbook" element={<Wordbook />} />
        <Route path="/wordbook/quiz" element={<WordbookQuiz />} />
        <Route path="/wordbook/list" element={<WordbookList />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mypage" element={<MyPage />} />
        {/* catch-all: redirect unknown paths to home (handles invalid public base URLs) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
