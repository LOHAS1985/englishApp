import type { WordbookColor } from "../../api/client";
import { COLOR_LABELS, COLOR_ORDER } from "./wordbookRules";

const DOT: Record<WordbookColor, string> = {
  NONE: "bg-white border-slate-400",
  BLUE: "bg-[#2463a8] border-[#2463a8]",
  YELLOW: "bg-[#e6b800] border-[#e6b800]",
  RED: "bg-[#c0392b] border-[#c0392b]",
};

interface ColorButtonsProps {
  value: WordbookColor;
  onChange: (color: WordbookColor) => void;
  disabled?: boolean;
}

/** 単語の色を手動で付ける丸いボタン。選んでいる色は枠で示す */
export default function ColorButtons({ value, onChange, disabled = false }: ColorButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      {COLOR_ORDER.map((color) => (
        <button
          key={color}
          type="button"
          disabled={disabled}
          aria-label={COLOR_LABELS[color]}
          aria-pressed={value === color}
          title={COLOR_LABELS[color]}
          onClick={() => onChange(color)}
          className={`w-7 h-7 rounded-full border-2 transition disabled:opacity-40 ${DOT[color]} ${
            value === color ? "ring-2 ring-offset-2 ring-slate-700" : "opacity-60 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}
