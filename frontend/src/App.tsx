import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { flushOutbox } from "./api/client";
import Home from "./pages/Home";
import Writing from "./features/writing/Writing";
import Grammar from "./features/grammar/Grammar";
import Reading from "./features/reading/Reading";
import ArticleDetail from "./features/reading/ArticleDetail";
import Listening from "./features/listening/Listening";
import Speaking from "./features/speaking/Speaking";
import Vocab from "./features/vocab/Vocab";
import ReadingPractice from "./features/reading/ReadingPractice";
import Admin from "./pages/Admin";
import MyPage from "./pages/MyPage";
import DeviceGate from "./features/device/DeviceGate";
import Mock from "./features/mock/Mock";

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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/reading/article" element={<ArticleDetail />} />
        <Route path="/reading/practice" element={<ReadingPractice />} />
        <Route path="/vocab" element={<Vocab />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/mock" element={<Mock />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mypage" element={<MyPage />} />
        {/* catch-all: redirect unknown paths to home (handles invalid public base URLs) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
