import { useState } from "react";
import { fetchWritingQuestion } from "../api/client";

export default function Writing() {
  const [question, setQuestion] = useState<{
    topic: string;
    instructions: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const data = await fetchWritingQuestion();
      setQuestion(data);
    } catch {
      alert("取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>ライティング問題</h1>
      <button onClick={handleFetch} disabled={loading}>
        {loading ? "出題中..." : "問題を出題する"}
      </button>
      {question && (
        <div>
          <h3>{question.topic}</h3>
          <p>{question.instructions}</p>
        </div>
      )}
    </div>
  );
}
