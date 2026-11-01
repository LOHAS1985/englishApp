import PracticeSetPage from "../../shared/components/PracticeSetPage";
import ListeningPlayer from "./ListeningPlayer";

const TYPES = ["toeic-part2", "toeic-part3", "toeic-part4", "eiken-part1", "eiken-part2", "eiken-part3"];

export default function Listening() {
  return (
    <PracticeSetPage
      feature="listening"
      types={TYPES}
      showTitle={false}
      renderMaterial={(set) => <ListeningPlayer key={set.id} setId={set.id} />}
    />
  );
}
