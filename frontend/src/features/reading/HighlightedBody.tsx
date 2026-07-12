import { useState } from "react";
import { buildHighlightSegments } from "./highlightVocabulary";
import type { VocabularyItem } from "../../api/client";

export default function HighlightedBody({
  body,
  vocabulary,
}: {
  body: string;
  vocabulary: VocabularyItem[];
}) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const segments = buildHighlightSegments(body, vocabulary);

  return (
    <p className="text-sm text-slate-700 leading-loose whitespace-pre-wrap mb-8">
      {segments.map((seg) => {
        if (!seg.vocab) {
          return <span key={seg.key}>{seg.words[0].text}</span>;
        }

        const isHovered = hoveredGroup === seg.groupId;

        return (
          <span key={seg.key} className="relative">
            {seg.words.map((w, i) =>
              w.isWord ? (
                <span
                  key={i}
                  onMouseEnter={() => setHoveredGroup(seg.groupId)}
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
              ),
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
