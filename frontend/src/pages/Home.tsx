import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>英語学習アプリ</h1>
      <button onClick={() => navigate("/writing")}>ライティング問題</button>
    </div>
  );
}
