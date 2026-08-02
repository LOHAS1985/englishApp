import { useState } from "react";
import { buildHighlightSegments } from "./highlightVocabulary";
import type { VocabularyItem } from "../../api/client";

function Paragraph({
  text,
  vocabulary,
  isLead,
  hoveredGroup,
  setHoveredGroup,
  paragraphIndex,
}: {
  text: string;
  vocabulary: VocabularyItem[];
  isLead: boolean;
  hoveredGroup: string | null;
  setHoveredGroup: (id: string | null) => void;
  paragraphIndex: number;
}) {
  const segments = buildHighlightSegments(text, vocabulary);

  return (
    <p
      className={
        isLead
          ? "font-serif text-[19px] leading-9 text-slate-800 mb-6"
          : "text-[15px] leading-8 text-slate-700 mb-5"
      }
    >
      {segments.map((seg, segIdx) => {
        const groupKey = seg.groupId ? `p${paragraphIndex}-${seg.groupId}` : null;

        if (!seg.vocab) {
          return <span key={`${paragraphIndex}-${segIdx}`}>{seg.words[0].text}</span>;
        }

        const isHovered = hoveredGroup === groupKey;

        return (
          <span key={`${paragraphIndex}-${segIdx}`} className="relative">
            {seg.words.map((w, i) =>
              w.isWord ? (
                <span
                  key={i}
                  onMouseEnter={() => setHoveredGroup(groupKey)}
                  onMouseLeave={() => setHoveredGroup(null)}
                  className={`cursor-help border-b border-dashed transition-colors ${
                    isHovered
                      ? "text-[#8fae4e] border-[#8fae4e] font-semibold"
                      : "border-slate-300"
                  }`}
                >
                  {w.text}
                </span>
              ) : (
                <span key={i}>{w.text}</span>
              )
            )}
            {isHovered && (
              <span
                className="absolute left-0 bottom-full mb-1 whitespace-nowrap bg-[#16233d] text-white
                           text-xs font-normal rounded px-2 py-1 z-10 pointer-events-none"
              >
                {seg.vocab.meaning}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

export default function HighlightedBody({
  body,
  vocabulary,
}: {
  body: string;
  vocabulary: VocabularyItem[];
}) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="mb-8">
      {paragraphs.map((paragraph, i) => (
        <Paragraph
          key={i}
          text={paragraph}
          vocabulary={vocabulary}
          isLead={i === 0}
          hoveredGroup={hoveredGroup}
          setHoveredGroup={setHoveredGroup}
          paragraphIndex={i}
        />
      ))}
    </div>
  );
}