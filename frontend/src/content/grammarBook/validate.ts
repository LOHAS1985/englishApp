import { CHAPTERS } from "./chapters";

/** 教科書の1章分の内容(JSON)の検査。問題があれば、直す場所が分かる日本語の文言を返す(無ければ空の配列) */

const JAPANESE = /[぀-ヿ㐀-鿿]/;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const LABELS = ["A", "B", "C", "D"];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** 文章に書いてはいけないもの(HTML・Markdown の見出し・コード)と、太字の記号の対応 */
function textProblems(where: string, text: string): string[] {
  const out: string[] = [];
  if (/<\/?[a-zA-Z][^>]*>/.test(text)) out.push(`${where}: HTML のタグは書けません`);
  if (/```|^#{1,6}\s/m.test(text)) out.push(`${where}: Markdown の見出し・コードは書けません(太字は ** だけ)`);
  if ((text.match(/\*\*/g) ?? []).length % 2 !== 0) out.push(`${where}: ** の数が合いません`);
  return out;
}

export function validateChapter(raw: unknown, expectedId: string): string[] {
  const errors: string[] = [];
  if (!isObj(raw)) return ["章の内容がオブジェクトではありません"];
  const info = CHAPTERS.find((c) => c.id === expectedId);
  if (!info) return [`章 ${expectedId} は chapters.ts にありません`];

  if (raw.id !== info.id) errors.push(`id は "${info.id}" にしてください`);
  if (raw.no !== info.no) errors.push(`no は ${info.no} にしてください`);
  if (raw.title !== info.title) errors.push(`title は "${info.title}" にしてください`);
  const lead = str(raw.lead);
  if (lead.length < 80) errors.push("lead(この章で学ぶこと)は80字以上で書いてください");
  errors.push(...textProblems("lead", lead));

  const sections = arr(raw.sections);
  if (sections.length < 3) errors.push("sections は3節以上にしてください");
  const sectionIds = new Set<string>();
  let itemCount = 0;
  let exampleCount = 0;

  sections.forEach((s, si) => {
    const at = `節${si + 1}`;
    if (!isObj(s)) {
      errors.push(`${at}: オブジェクトではありません`);
      return;
    }
    const id = str(s.id);
    if (!ID.test(id)) errors.push(`${at}: id は小文字・数字・ハイフンだけにしてください(${id})`);
    if (sectionIds.has(id)) errors.push(`${at}: id ${id} が重複しています`);
    sectionIds.add(id);
    if (!str(s.title).trim()) errors.push(`${at}: title がありません`);
    if (str(s.intro).length < 40) errors.push(`${at}(${id}): intro は40字以上で書いてください`);
    errors.push(...textProblems(`${at} intro`, str(s.intro)));
    if (!Array.isArray(s.keywords) || s.keywords.some((k) => typeof k !== "string" || !k)) {
      errors.push(`${at}(${id}): keywords は文字列の配列にしてください`);
    }
    if (s.examNote !== undefined) errors.push(...textProblems(`${at} examNote`, str(s.examNote)));

    const items = arr(s.items);
    if (items.length < 2) errors.push(`${at}(${id}): items は2項目以上にしてください`);
    items.forEach((it, ii) => {
      const where = `${at}(${id}) 項目${ii + 1}`;
      itemCount++;
      if (!isObj(it)) {
        errors.push(`${where}: オブジェクトではありません`);
        return;
      }
      if (!str(it.heading).trim()) errors.push(`${where}: heading がありません`);
      const explanation = str(it.explanation);
      if (explanation.length < 80) errors.push(`${where}「${str(it.heading)}」: explanation は80字以上で書いてください`);
      errors.push(...textProblems(`${where} explanation`, explanation));

      const examples = arr(it.examples);
      if (examples.length < 1) errors.push(`${where}「${str(it.heading)}」: 例文(examples)が1つもありません`);
      examples.forEach((ex, ei) => {
        const ew = `${where} 例文${ei + 1}`;
        exampleCount++;
        if (!isObj(ex)) {
          errors.push(`${ew}: オブジェクトではありません`);
          return;
        }
        const en = str(ex.en);
        const ja = str(ex.ja);
        if (words(en.replace(/\*\*/g, "")) < 3) errors.push(`${ew}: en は3語以上の英文にしてください`);
        if (!JAPANESE.test(ja)) errors.push(`${ew}: ja は日本語の訳にしてください`);
        if (JAPANESE.test(en)) errors.push(`${ew}: en に日本語が入っています`);
        for (const [k, v] of [["en", en], ["ja", ja], ["note", str(ex.note)]] as const) {
          errors.push(...textProblems(`${ew} ${k}`, v));
        }
      });
      for (const c of arr(it.cautions)) errors.push(...textProblems(`${where} cautions`, str(c)));

      if (it.table !== undefined) {
        const t = it.table;
        if (!isObj(t) || arr(t.headers).length === 0 || arr(t.rows).length === 0) {
          errors.push(`${where}: table は headers と rows が必要です`);
        } else {
          const n = arr(t.headers).length;
          arr(t.rows).forEach((r, ri) => {
            if (!Array.isArray(r) || r.length !== n || r.some((c) => typeof c !== "string")) {
              errors.push(`${where}: table の ${ri + 1} 行目の列数が headers(${n})と合いません`);
            }
          });
        }
      }
    });
  });

  if (itemCount < 12) errors.push(`項目が少なすぎます(${itemCount}。12以上)`);
  if (exampleCount < 20) errors.push(`例文が少なすぎます(${exampleCount}。20以上)`);

  const summary = arr(raw.summary);
  if (summary.length < 3 || summary.length > 12) errors.push("summary は3〜12個の箇条書きにしてください");
  summary.forEach((s) => errors.push(...textProblems("summary", str(s))));

  for (const r of arr(raw.related)) {
    if (typeof r !== "string" || !CHAPTERS.some((c) => c.id === r)) errors.push(`related に不明な章 ${String(r)} があります`);
  }

  const quiz = arr(raw.quiz);
  if (quiz.length < 8 || quiz.length > 15) errors.push(`確認問題(quiz)は8〜15問にしてください(${quiz.length})`);
  const quizIds = new Set<string>();
  const letters: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  quiz.forEach((q, qi) => {
    const where = `確認問題${qi + 1}`;
    if (!isObj(q)) {
      errors.push(`${where}: オブジェクトではありません`);
      return;
    }
    const id = str(q.id);
    if (id !== `${expectedId}-q${String(qi + 1).padStart(2, "0")}`) {
      errors.push(`${where}: id は "${expectedId}-q${String(qi + 1).padStart(2, "0")}" にしてください(${id})`);
    }
    if (quizIds.has(id)) errors.push(`${where}: id が重複しています`);
    quizIds.add(id);
    if (str(q.sentence).trim().length < 8) errors.push(`${where}: sentence が短すぎます`);
    const choices = arr(q.choices);
    const labels = choices.map((c) => (isObj(c) ? str(c.label) : ""));
    if (choices.length !== 4 || labels.join("") !== LABELS.join("")) {
      errors.push(`${where}: choices は label が A・B・C・D の4つにしてください`);
    }
    const texts = choices.map((c) => (isObj(c) ? str(c.text).trim() : ""));
    if (texts.some((t) => !t)) errors.push(`${where}: 空の選択肢があります`);
    if (new Set(texts.map((t) => t.toLowerCase())).size !== texts.length) errors.push(`${where}: 同じ選択肢があります`);
    const answer = str(q.answer);
    if (!LABELS.includes(answer)) errors.push(`${where}: answer は A〜D のどれかにしてください`);
    else letters[answer]++;
    if (str(q.explanation).length < 50) errors.push(`${where}: explanation は50字以上で書いてください(なぜ正解か、他はなぜ違うか)`);
    for (const [k, v] of [["sentence", str(q.sentence)], ["explanation", str(q.explanation)], ["translation", str(q.translation)]] as const) {
      errors.push(...textProblems(`${where} ${k}`, v));
    }
  });
  const maxLetter = Math.max(...Object.values(letters));
  if (quiz.length > 0 && maxLetter > Math.ceil(quiz.length * 0.45)) {
    errors.push(`確認問題の正解の記号が偏っています(${JSON.stringify(letters)})。A〜D をほぼ均等にしてください`);
  }
  return errors;
}
