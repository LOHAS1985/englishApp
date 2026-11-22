/**
 * 表示サイズの設定(文字の大きさと、問題カードを画面いっぱいに広げるか)。端末ごとにブラウザへ保存する。
 * 文字の大きさは html の font-size で変える。Tailwind の寸法はすべて rem なので、文字・余白・問題カードの幅が一緒に大きくなる。
 */

/** 文字の大きさの段階(%)。100 が標準。増やすと、ヘッダーのメニューの選択肢も増える */
export const FONT_SCALES = [100, 125, 150] as const;

/** 配色。system は端末の設定(ダークモード)に合わせる */
export const THEMES = ["system", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export interface DisplaySettings {
  /** FONT_SCALES のどれか(%) */
  fontScale: number;
  /** true なら問題カードの幅の上限を外し、画面いっぱいに広げる */
  fullWidth: boolean;
  theme: Theme;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = { fontScale: 100, fullWidth: false, theme: "system" };

/** 実際に使う配色。system のときは端末がダークモードかどうかで決める */
export function resolveTheme(theme: Theme, systemPrefersDark: boolean): "light" | "dark" {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}

const STORAGE_KEY = "displaySettings";

/** 保存された値が壊れていても、標準の表示に戻して動かす */
export function parseDisplaySettings(raw: string | null): DisplaySettings {
  if (!raw) return DEFAULT_DISPLAY_SETTINGS;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return DEFAULT_DISPLAY_SETTINGS;
    const { fontScale, fullWidth, theme } = value as Record<string, unknown>;
    return {
      fontScale: FONT_SCALES.find((s) => s === fontScale) ?? DEFAULT_DISPLAY_SETTINGS.fontScale,
      fullWidth: fullWidth === true,
      theme: THEMES.find((t) => t === theme) ?? DEFAULT_DISPLAY_SETTINGS.theme,
    };
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

export function loadDisplaySettings(): DisplaySettings {
  try {
    return parseDisplaySettings(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_DISPLAY_SETTINGS;
  }
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** matchMedia が無い環境(古いブラウザ・テスト)ではライトとして扱う */
function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches;
}

/**
 * 画面に反映する。全幅は html の data-wide 属性、配色は data-theme 属性で表し、index.css が見た目を切り替える。
 * 配色が system のときは、端末の設定が変わっても追従できるよう、呼び出し側が watchSystemTheme を使う。
 */
export function applyDisplaySettings(settings: DisplaySettings) {
  const root = document.documentElement;
  root.style.fontSize = `${settings.fontScale}%`;
  root.setAttribute("data-theme", resolveTheme(settings.theme, systemPrefersDark()));
  if (settings.fullWidth) {
    root.setAttribute("data-wide", "");
  } else {
    root.removeAttribute("data-wide");
  }
}

/** 端末のダークモードの設定が変わったら、保存した設定で反映し直す(最初の1回だけ呼ぶ) */
export function watchSystemTheme() {
  if (typeof window.matchMedia !== "function") return;
  window.matchMedia(DARK_QUERY).addEventListener("change", () => applyDisplaySettings(loadDisplaySettings()));
}

export function saveDisplaySettings(settings: DisplaySettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくても、この画面の間は反映される
  }
  applyDisplaySettings(settings);
}
