// リスニングの問題集を、難易度 1〜5 = 10/20/30/20/20% のまま総数 1000 セットにするための計画を出す。
// 作業は2段階で進める(docs/question-authoring.md の 1.1)。
//   1. 書き直し:レベル1・2の余っているセット(未解答・解答の少ないもの)を、新しい ID で不足しているレベルに書き直し、
//      元のセットは問題集から外す。対象は scripts/questions/listening-rewrite.json に固定してある
//   2. 追加:書き直しが終わったら、形式ごと・レベルごとの不足に比例して、総数 1000 になるまで新しいセットを足す
//
// usage(リポジトリのルートで実行):
//   node scripts/questions/plan.js                 形式ごとの現状・目標・不足数
//   node scripts/questions/plan.js today [8]       今日の作業(書き直しの対象、または追加する形式とレベルの内訳)
//   node scripts/questions/plan.js retire l0005 l0006 ...
//       書き直しが済んだ元のセットを問題集から外す(書き直しの対象に入っている ID だけ)
//   node scripts/questions/plan.js select <history.json>
//       書き直しの対象を選んで listening-rewrite.json に書く(一度だけ実行する)。history.json はブラウザの
//       localStorage の "englishApp.history.listening"(設問ごとの解答履歴)を保存したもの
//
// - 難易度はすべてのセットの JSON に書いてある(推定に頼らない)。追加・書き直しのセットにも必ず difficulty を書く
// - 現状は backend/src/main/resources/questions/listening/*.json から直接数える
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const BANK_DIR = path.join(ROOT, "backend/src/main/resources/questions/listening");
const REWRITE_FILE = path.join(__dirname, "listening-rewrite.json");
const LEVELS = [1, 2, 3, 4, 5];
const RATIO = { 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.2, 5: 0.2 };
// 最終的な形式ごとのセット数(合計 1000)。2026-11-08 時点の形式ごとの比率(計 580 セット)を 1000 に広げたもの
const TYPE_TOTALS = {
  "toeic-part3": 210,
  "toeic-part4": 171,
  "toeic-part2": 131,
  "eiken-part1": 172,
  "eiken-part2": 148,
  "eiken-part3": 168,
};
const FINAL_TOTAL = Object.values(TYPE_TOTALS).reduce((a, b) => a + b, 0);

function loadBank() {
  const sets = [];
  for (const f of fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".json")).sort()) {
    for (const s of JSON.parse(fs.readFileSync(path.join(BANK_DIR, f), "utf8"))) {
      sets.push({ id: s.id, type: s.type, difficulty: s.difficulty, file: f });
    }
  }
  return sets;
}

const emptyCounts = () => ({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
function countByType(sets) {
  const counts = {};
  for (const s of sets) {
    (counts[s.type] ??= emptyCounts())[s.difficulty]++;
  }
  return counts;
}

/** 合計が n になるように比率で配る(最大剰余法) */
function apportion(weights, n) {
  const keys = Object.keys(weights);
  const sum = keys.reduce((s, k) => s + weights[k], 0);
  if (sum === 0 || n <= 0) return Object.fromEntries(keys.map((k) => [k, 0]));
  const raw = keys.map((k) => ({ k, v: (weights[k] * n) / sum }));
  const out = Object.fromEntries(raw.map(({ k, v }) => [k, Math.floor(v)]));
  let rest = n - keys.reduce((s, k) => s + out[k], 0);
  raw.sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)) || weights[b.k] - weights[a.k]);
  for (const { k } of raw) {
    if (rest-- <= 0) break;
    out[k]++;
  }
  return out;
}

/** 形式ごとの、レベル別の目標数(総数 total を比率で配る) */
const levelTargets = (total) => apportion(RATIO, total);

function loadRewrites() {
  return fs.existsSync(REWRITE_FILE) ? JSON.parse(fs.readFileSync(REWRITE_FILE, "utf8")) : [];
}

const pct = (c) => {
  const sum = LEVELS.reduce((s, l) => s + c[l], 0) || 1;
  return LEVELS.map((l) => `${Math.round((100 * c[l]) / sum)}%`.padStart(4)).join(" ");
};
const row = (c) => LEVELS.map((l) => String(c[l]).padStart(5)).join("");

function summary() {
  const sets = loadBank();
  const counts = countByType(sets);
  const ids = new Set(sets.map((s) => s.id));
  const rewrites = loadRewrites();
  const left = rewrites.filter((r) => ids.has(r.old)).length;
  console.log(`リスニング ${sets.length} / ${FINAL_TOTAL} セット  比率の目標 1〜5 = 10/20/30/20/20%`);
  console.log(`書き直し: 残り ${left} / ${rewrites.length} セット\n`);
  console.log("形式          現在(L1〜L5)                   比率                     最終目標(L1〜L5)               あと");
  for (const type of Object.keys(TYPE_TOTALS)) {
    const c = counts[type] ?? emptyCounts();
    const t = levelTargets(TYPE_TOTALS[type]);
    const n = LEVELS.reduce((s, l) => s + c[l], 0);
    console.log(`${type.padEnd(12)}${row(c)}   ${pct(c)}   ${row(t)}   ${String(TYPE_TOTALS[type] - n).padStart(4)}`);
  }
}

function today(n) {
  const sets = loadBank();
  const byId = new Map(sets.map((s) => [s.id, s]));
  const pending = loadRewrites().filter((r) => byId.has(r.old));
  if (pending.length > 0) {
    const batch = pending.slice(0, n);
    console.log(`【書き直し】残り ${pending.length} セットのうち、今日は ${batch.length} セット`);
    console.log("新しい ID で、指定のレベルの基準(docs/question-authoring.md の 4.2)に合わせて作り直し、元のセットは削除する。\n");
    for (const r of batch) {
      console.log(`  ${r.old}(${byId.get(r.old).file}、${r.type}、レベル${r.from}) → 新しい ID でレベル${r.to}`);
    }
    return;
  }
  const counts = countByType(sets);
  const deficits = {};
  for (const type of Object.keys(TYPE_TOTALS)) {
    const t = levelTargets(TYPE_TOTALS[type]);
    const c = counts[type] ?? emptyCounts();
    for (const l of LEVELS) {
      const d = t[l] - c[l];
      if (d > 0) deficits[`${type}:${l}`] = d;
    }
  }
  const missing = Object.values(deficits).reduce((a, b) => a + b, 0);
  if (missing === 0) {
    console.log(`完了:リスニングは ${sets.length} セットで、どの形式も目標の比率に達しています。`);
    return;
  }
  const alloc = apportion(deficits, Math.min(n, missing));
  console.log(`【追加】総数 ${sets.length} → ${FINAL_TOTAL}(残り ${missing} セット)。今日は ${Math.min(n, missing)} セット\n`);
  for (const [key, k] of Object.entries(alloc).filter(([, k]) => k > 0)) {
    const [type, level] = key.split(":");
    console.log(`  ${type.padEnd(12)} レベル${level} ×${k}`);
  }
}

function select(historyFile) {
  if (fs.existsSync(REWRITE_FILE)) {
    console.error(`${path.relative(ROOT, REWRITE_FILE)} は作成済みです(作り直すときは削除してから実行)`);
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  // セット問題の解答は設問1の行で1回と数える(picker.ts の attemptsFromRows と同じ)
  const attempts = new Map();
  for (const r of rows) if (r.questionNo === 1) attempts.set(r.itemId, (attempts.get(r.itemId) ?? 0) + 1);

  const sets = loadBank();
  const counts = countByType(sets);
  const perType = {};
  for (const type of Object.keys(TYPE_TOTALS)) {
    const c = counts[type];
    const total = LEVELS.reduce((s, l) => s + c[l], 0);
    const t = levelTargets(total);
    // 余っているレベル1・2から、解答の少ないもの(同数なら ID 順)を選び、足りないレベルに振る
    const from = [];
    for (const l of [1, 2]) {
      const surplus = Math.max(0, c[l] - t[l]);
      const candidates = sets
        .filter((s) => s.type === type && s.difficulty === l)
        .sort((a, b) => (attempts.get(a.id) ?? 0) - (attempts.get(b.id) ?? 0) || a.id.localeCompare(b.id));
      from.push(...candidates.slice(0, surplus));
    }
    // 書き直し先のレベルは、途中でも比率が偏らないよう、不足数に比例して混ぜて並べる
    const need = Object.fromEntries([3, 4, 5].map((l) => [l, Math.max(0, t[l] - c[l])]));
    const placed = { 3: 0, 4: 0, 5: 0 };
    const to = [];
    while (to.length < need[3] + need[4] + need[5]) {
      const l = [5, 4, 3]
        .filter((l) => placed[l] < need[l])
        .reduce((best, l) => ((placed[l] + 1) / need[l] < (placed[best] + 1) / need[best] ? l : best));
      placed[l]++;
      to.push(l);
    }
    perType[type] = from.slice(0, to.length).map((s, i) => ({
      old: s.id,
      type,
      from: s.difficulty,
      to: to[i],
      attempts: attempts.get(s.id) ?? 0,
    }));
  }
  // 毎日の作業がどの形式にも回るよう、形式を順番に並べる
  const list = [];
  for (let i = 0; Object.values(perType).some((l) => i < l.length); i++) {
    for (const l of Object.values(perType)) if (i < l.length) list.push(l[i]);
  }
  fs.writeFileSync(REWRITE_FILE, "[\n" + list.map((r) => "  " + JSON.stringify(r)).join(",\n") + "\n]\n");
  const answered = list.filter((r) => r.attempts > 0);
  console.log(`書き直しの対象 ${list.length} セットを ${path.relative(ROOT, REWRITE_FILE)} に書きました`);
  console.log(`うち解答済み ${answered.length} セット${answered.length ? `(最多 ${Math.max(...answered.map((r) => r.attempts))} 回)` : ""}`);
}

/**
 * 書き直しが済んだ元のセットを問題集から外す(書き直しの対象に入っている ID だけ)。
 * 1セット1行のファイルから該当の行だけを消し、ほかの行の書式は変えない
 */
function retire(ids) {
  const allowed = new Set(loadRewrites().map((r) => r.old));
  const bad = ids.filter((id) => !allowed.has(id));
  if (bad.length) {
    console.error(`書き直しの対象ではない ID です: ${bad.join(", ")}`);
    process.exit(1);
  }
  const targets = new Set(ids);
  let removed = 0;
  for (const f of fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".json"))) {
    const file = path.join(BANK_DIR, f);
    const text = fs.readFileSync(file, "utf8");
    const before = JSON.parse(text);
    const hit = before.filter((s) => targets.has(s.id));
    if (!hit.length) continue;
    const lines = text.split("\n");
    const kept = lines.filter((ln) => {
      const m = ln.match(/^ {2}(\{.*\}),?$/);
      return !(m && targets.has(JSON.parse(m[1]).id));
    });
    // 最後のセットの行末のカンマを外す
    const last = kept.map((ln) => /^ {2}\{.*\},?$/.test(ln)).lastIndexOf(true);
    if (last >= 0) kept[last] = kept[last].replace(/,$/, "");
    const after = JSON.parse(kept.join("\n"));
    if (after.length !== before.length - hit.length || after.some((s) => targets.has(s.id))) {
      console.error(`${f}: 1セット1行の形式ではないため外せませんでした`);
      process.exit(1);
    }
    if (after.length === 0) fs.unlinkSync(file);
    else fs.writeFileSync(file, kept.join("\n"));
    removed += hit.length;
    console.log(`${f}: ${hit.map((s) => s.id).join(", ")} を外しました`);
  }
  console.log(`計 ${removed} セットを外しました`);
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "today") today(Number(rest[0] ?? 8));
else if (cmd === "select") select(rest[0]);
else if (cmd === "retire") retire(rest);
else summary();
