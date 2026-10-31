import PracticeSetPage from "../../shared/components/PracticeSetPage";
import ListeningPlayer from "./ListeningPlayer";

const TYPE_LABELS = {
  "toeic-part2": "TOEIC Part 2(応答)",
  "toeic-part3": "TOEIC Part 3(会話)",
  "toeic-part4": "TOEIC Part 4(説明文)",
  "eiken-part1": "英検 Part 1(会話)",
  "eiken-part2": "英検 Part 2(説明文)",
  "eiken-part3": "英検 Part 3(Real-Life)",
};

export default function Listening() {
  return (
    <PracticeSetPage
      feature="listening"
      eyebrow="LISTENING"
      title="リスニング問題"
      typeLabels={TYPE_LABELS}
      renderMaterial={(set) => <ListeningPlayer key={set.id} setId={set.id} />}
    />
  );
}
