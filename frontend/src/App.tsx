import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Writing from "./pages/Writing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import History from "./pages/History";
import Grammar from "./pages/Grammar";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/englishApp">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/grammar" element={<Grammar />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
