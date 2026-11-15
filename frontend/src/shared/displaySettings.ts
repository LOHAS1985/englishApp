/**
 * 表示サイズの設定(文字の大きさと、問題カードを画面いっぱいに広げるか)。端末ごとにブラウザへ保存する。
 * 文字の大きさは html の font-size で変える。Tailwind の寸法はすべて rem なので、文字・余白・問題カードの幅が一緒に大きくなる。
 */

/** 文字の大きさの段階(%)。100 が標準 */
export const FONT_SCALES = [100, 115, 130, 150, 175, 200] as const;

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

/** system → dark → light → system の順に切り替える */
export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
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

/** 1段階大きく(delta=1)・小さく(delta=-1)した文字の大きさ。端に達したら動かさない */
export function stepFontScale(current: number, delta: 1 | -1): number {
  const index = FONT_SCALES.findIndex((s) => s === current);
  const base = index === -1 ? 0 : index;
  return FONT_SCALES[Math.min(Math.max(base + delta, 0), FONT_SCALES.length - 1)];
}

/**
 * 画面の幅(px)に合わせた文字の大きさ。画面が広いほど大きくし、全幅表示と組み合わせて問題を画面いっぱいに出す。
 * スマホ(640px 未満)は、もともと幅いっぱいなので標準のまま。
 */
export function fitFontScale(viewportWidth: number): number {
  if (viewportWidth < 640) return 100;
  if (viewportWidth < 1024) return 115;
  if (viewportWidth < 1440) return 130;
  if (viewportWidth < 1920) return 150;
  if (viewportWidth < 2560) return 175;
  return 200;
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
