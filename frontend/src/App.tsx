import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter basename="/englishApp">
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
        <Route path="/admin" element={<Admin />} />
        <Route path="/mypage" element={<MyPage />} />
        {/* catch-all: redirect unknown paths to home (handles invalid public base URLs) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
