import { Fragment } from "react";
import { splitBold, toBlocks } from "./textMarkup";

/** 1行の文章。**語** を太字にする */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {splitBold(text).map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-semibold text-slate-900">
            {part.text}
          </strong>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

/** 教科書の説明文。空行で段落、行頭の「・」で箇条書き、** で太字 */
export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {toBlocks(text).map((block, i) =>
        block.kind === "list" ? (
          <ul key={i} className="my-2 list-disc space-y-1 pl-5">
            {block.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i} className="my-2 leading-relaxed">
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <Inline text={line} />
              </Fragment>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
