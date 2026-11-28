import type { Example, Item, Section, Table } from "../../content/grammarBook/types";
import PronounceButton from "../wordbook/PronounceButton";
import RichText, { Inline } from "./RichText";

function ExampleView({ example }: { example: Example }) {
  return (
    <li className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="flex items-start gap-2 font-serif text-base leading-relaxed text-slate-900">
        <span className="flex-1">
          <Inline text={example.en} />
        </span>
        <PronounceButton word={example.en.replace(/\*\*/g, "")} label="例文を再生" className="shrink-0" />
      </p>
      <p className="mt-1 text-sm text-slate-600">{example.ja}</p>
      {example.note && (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          <Inline text={example.note} />
        </p>
      )}
    </li>
  );
}

function TableView({ table }: { table: Table }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {table.caption && <caption className="mb-1 text-left text-xs text-slate-500">{table.caption}</caption>}
        <thead>
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="border border-slate-200 bg-slate-100 px-3 py-1.5 text-left font-semibold text-slate-700">
                <Inline text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-slate-200 px-3 py-1.5 align-top text-slate-700">
                  <Inline text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemView({ item, no }: { item: Item; no: number }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold text-[#2463a8]">項目 {no}</p>
      <h3 className="mt-0.5 text-base font-semibold text-slate-900">{item.heading}</h3>
      <RichText text={item.explanation} className="mt-2 text-sm text-slate-700" />
      {item.table && <TableView table={item.table} />}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">例文</p>
      <ul className="mt-2 space-y-2" aria-label="例文">
        {item.examples.map((ex, i) => (
          <ExampleView key={i} example={ex} />
        ))}
      </ul>
      {item.cautions && item.cautions.length > 0 && (
        <div className="mt-3 rounded-md border-l-4 border-l-[#c0392b] bg-[#fbeceb] px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-[#c0392b]">間違えやすい点</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {item.cautions.map((c, i) => (
              <li key={i}>
                <Inline text={c} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/**
 * 節のページ。節の最初のページ(showIntro)には節の題名と導入を出し、最後のページ(showExamNote)には試験での出方を出す。
 * 続きのページには、どの節の続きかが分かるように題名を「(続き)」付きで出す。
 */
export function SectionPage({
  section,
  items,
  showIntro,
  showExamNote,
  continued,
  startNo,
}: {
  section: Section;
  items: Item[];
  showIntro: boolean;
  showExamNote: boolean;
  continued: boolean;
  /** このページの最初の項目が、節の何番目か(項目の番号を続けるため) */
  startNo: number;
}) {
  return (
    <section aria-labelledby="book-page-title" className="space-y-4">
      <h2 id="book-page-title" className="font-serif text-xl text-slate-900">
        {section.title}
        {continued && <span className="ml-2 text-sm font-normal text-slate-500">(続き)</span>}
      </h2>
      {showIntro && <RichText text={section.intro} className="text-sm text-slate-600" />}
      {items.map((item, i) => (
        <ItemView key={i} item={item} no={startNo + i + 1} />
      ))}
      {showExamNote && section.examNote && (
        <div className="rounded-md border border-[#8fae4e] bg-[#f2f7ea] px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-[#6a8a3e]">試験での出方</p>
          <RichText text={section.examNote} className="text-sm text-slate-700" />
        </div>
      )}
    </section>
  );
}
