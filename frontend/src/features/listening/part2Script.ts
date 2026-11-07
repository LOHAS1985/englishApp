/**
 * TOEIC Part 2 の台本を問題ごとに分ける。台本は問題ごとに「Narrator: Number N.」の行で始まる
 * (ListeningQuestionBank.withPart2Script が組み立てる)。番号の行は問題番号と重なるので外す。
 */
const NUMBER_LINE = /^Narrator: Number \d+\.$/;

export function splitPart2Script(script: string): string[] {
  const blocks: string[][] = [];
  for (const line of script.split("\n")) {
    if (NUMBER_LINE.test(line) || blocks.length === 0) blocks.push([]);
    if (!NUMBER_LINE.test(line)) blocks[blocks.length - 1].push(line);
  }
  return blocks.map((lines) => lines.join("\n").trim());
}
