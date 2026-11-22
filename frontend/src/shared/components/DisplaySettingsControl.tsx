import { useState } from "react";
import {
  FONT_SCALES,
  THEMES,
  loadDisplaySettings,
  saveDisplaySettings,
  type DisplaySettings,
  type Theme,
} from "../displaySettings";

const THEME_LABELS: Record<Theme, string> = { system: "端末に合わせる", dark: "ダーク", light: "ライト" };
const FONT_LABELS: Record<(typeof FONT_SCALES)[number], string> = { 100: "標準", 125: "大きめ", 150: "特大" };

interface Option<T> {
  value: T;
  label: string;
}

/** 選択肢を並べて、いま選んでいるものを押し込んだ状態で示す */
function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs text-slate-300">{label}</p>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`rounded border px-2 py-1 text-sm transition-colors ${
                selected
                  ? "border-[#8fae4e] bg-[#8fae4e] font-semibold text-[#0f1724]"
                  : "border-slate-400 text-white hover:bg-slate-600"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 表示の設定(配色・文字の大きさ・全幅)。ヘッダーのメニューに入れる。端末ごとにブラウザへ保存する。
 * 全幅は問題カードを画面いっぱいに広げるためのもので、スマホではもともと幅いっぱいなので出さない。
 */
export default function DisplaySettingsControl() {
  const [settings, setSettings] = useState<DisplaySettings>(loadDisplaySettings);

  const update = (next: DisplaySettings) => {
    setSettings(next);
    saveDisplaySettings(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <Choice<Theme>
        label="配色"
        value={settings.theme}
        options={THEMES.map((theme) => ({ value: theme, label: THEME_LABELS[theme] }))}
        onChange={(theme) => update({ ...settings, theme })}
      />
      <Choice<number>
        label="文字の大きさ"
        value={settings.fontScale}
        options={FONT_SCALES.map((scale) => ({ value: scale, label: FONT_LABELS[scale] }))}
        onChange={(fontScale) => update({ ...settings, fontScale })}
      />
      <button
        type="button"
        onClick={() => update({ ...settings, fullWidth: !settings.fullWidth })}
        aria-pressed={settings.fullWidth}
        className={`hidden sm:block rounded border px-2 py-1 text-left text-sm transition-colors ${
          settings.fullWidth
            ? "border-[#8fae4e] bg-[#8fae4e] font-semibold text-[#0f1724]"
            : "border-slate-400 text-white hover:bg-slate-600"
        }`}
      >
        問題を全幅に広げる
      </button>
    </div>
  );
}
