import { useState } from "react";
import {
  FONT_SCALES,
  fitFontScale,
  loadDisplaySettings,
  saveDisplaySettings,
  stepFontScale,
  type DisplaySettings,
} from "../displaySettings";

const buttonClass =
  "text-xs font-semibold text-white border border-slate-400 rounded px-2 py-1 hover:bg-slate-600 disabled:opacity-40 disabled:hover:bg-transparent";

/** ヘッダーに置く、文字の大きさと全幅表示の切り替え。問題を画面いっぱいに読みやすく出すためのもの */
export default function DisplaySettingsControl() {
  const [settings, setSettings] = useState<DisplaySettings>(loadDisplaySettings);

  const update = (next: DisplaySettings) => {
    setSettings(next);
    saveDisplaySettings(next);
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="表示サイズ">
      <button
        onClick={() => update({ ...settings, fontScale: stepFontScale(settings.fontScale, -1) })}
        disabled={settings.fontScale === FONT_SCALES[0]}
        className={buttonClass}
        aria-label="文字を小さくする"
      >
        A−
      </button>
      <span className="hidden sm:inline-block min-w-[3rem] text-center font-mono text-xs text-slate-200">
        {settings.fontScale}%
      </span>
      <button
        onClick={() => update({ ...settings, fontScale: stepFontScale(settings.fontScale, 1) })}
        disabled={settings.fontScale === FONT_SCALES[FONT_SCALES.length - 1]}
        className={buttonClass}
        aria-label="文字を大きくする"
      >
        A+
      </button>
      {/* スマホでは問題カードがもともと画面の幅いっぱいなので、全幅の切り替えは出さない */}
      <button
        onClick={() => update({ ...settings, fullWidth: !settings.fullWidth })}
        aria-pressed={settings.fullWidth}
        className={`hidden sm:inline-block ${buttonClass} ${settings.fullWidth ? "bg-[#8fae4e] border-[#8fae4e] text-[#0f1724] hover:bg-[#8fae4e]" : ""}`}
      >
        全幅
      </button>
      <button
        onClick={() => update({ fontScale: fitFontScale(window.innerWidth), fullWidth: true })}
        className={`hidden sm:inline-block ${buttonClass}`}
        title="いまの画面の幅に合わせて、文字の大きさを決めて全幅にする"
      >
        自動
      </button>
    </div>
  );
}
