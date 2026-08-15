import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext";
import Home from "./pages/Home";
import Writing from "./features/writing/Writing";
import History from "./features/writing/History";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import Grammar from "./features/grammar/Grammar";
import Reading from "./features/reading/Reading";
import ArticleDetail from "./features/reading/ArticleDetail";
import Listening from "./features/listening/Listening";
import Speaking from "./features/speaking/Speaking";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/englishApp">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/grammar" element={<Grammar />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/reading/article" element={<ArticleDetail />} />
          <Route path="/listening" element={<Listening />} />
          <Route path="/speaking" element={<Speaking />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/history" element={<History />} />
          {/* catch-all: redirect unknown paths to home (handles invalid public base URLs) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
