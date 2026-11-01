/**
 * 出題の難易度(1=基礎 / 2=標準 / 3=発展)。問題を解く前にホームで一度だけ選び、問題画面へは ?level= で渡す。
 * 選んだ値はこの端末のブラウザに覚えておき、次にホームを開いたときの初期値にする。
 */
const LEVEL_KEY = "englishApp.level";

export function levelFromParams(params: URLSearchParams): number | undefined {
  const level = Number(params.get("level"));
  return level >= 1 && level <= 3 ? level : undefined;
}

export function loadSavedLevel(): number | undefined {
  try {
    const level = Number(localStorage.getItem(LEVEL_KEY));
    return level >= 1 && level <= 3 ? level : undefined;
  } catch {
    return undefined;
  }
}

export function saveLevel(level: number | undefined) {
  try {
    if (level) localStorage.setItem(LEVEL_KEY, String(level));
    else localStorage.removeItem(LEVEL_KEY);
  } catch {
    // 保存できなくても、今回選んだ難易度で出題する
  }
}

/** 難易度を選んで出題する画面(文法・語彙・読解・リスニング)へのパスに ?level= を付ける */
export function withLevel(path: string, level: number | undefined) {
  if (!level || !/^\/(grammar|vocab|reading\/practice|listening)(\?|$)/.test(path)) return path;
  return `${path}${path.includes("?") ? "&" : "?"}level=${level}`;
}
