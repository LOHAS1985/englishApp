import type { VocabularyItem } from "../../api/client";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface WordToken {
  text: string;
  isWord: boolean;
}

export interface HighlightSegment {
  key: string;
  words: WordToken[];
  vocab: VocabularyItem | null;
  groupId: string | null;
}

export function buildHighlightSegments(
  body: string,
  vocabulary: VocabularyItem[],
): HighlightSegment[] {
  if (vocabulary.length === 0) {
    return [
      {
        key: "t-0",
        words: [{ text: body, isWord: false }],
        vocab: null,
        groupId: null,
      },
    ];
  }

  const sorted = [...vocabulary].sort((a, b) => b.word.length - a.word.length);
  const pattern = sorted.map((v) => escapeRegExp(v.word)).join("|");
  const regex = new RegExp(`(${pattern})`, "gi");

  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let groupCounter = 0;
  const alreadyHighlighted = new Set<string>(); // ← 追加

  while ((match = regex.exec(body)) !== null) {
    const matchedText = match[0];
    const vocabItem =
      sorted.find((v) => v.word.toLowerCase() === matchedText.toLowerCase()) ?? null;

    // すでにハイライト済みの語彙は、通常テキストとして扱う(スキップ)
    const key = vocabItem?.word.toLowerCase() ?? null;
    if (key && alreadyHighlighted.has(key)) {
      continue;
    }
    if (key) alreadyHighlighted.add(key);

    if (match.index > lastIndex) {
      segments.push({
        key: `t-${lastIndex}`,
        words: [{ text: body.slice(lastIndex, match.index), isWord: false }],
        vocab: null,
        groupId: null,
      });
    }

    const groupId = `g-${groupCounter++}`;
    const wordTokens: WordToken[] = matchedText.split(/(\s+)/).map((token) => ({
      text: token,
      isWord: token.trim().length > 0,
    }));

    segments.push({
      key: `m-${match.index}`,
      words: wordTokens,
      vocab: vocabItem,
      groupId,
    });
    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < body.length) {
    segments.push({
      key: "t-end",
      words: [{ text: body.slice(lastIndex), isWord: false }],
      vocab: null,
      groupId: null,
    });
  }

  return segments;
}
