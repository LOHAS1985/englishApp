import { useNavigate } from "react-router-dom";
import LevelBadge from "../../features/level/LevelBadge";
import BuildVersion from "./BuildVersion";
import HeaderMenu from "./HeaderMenu";

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="w-full bg-slate-700 shadow-sm border-b border-slate-600">
      <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <button
            onClick={() => navigate("/")}
            className="text-base sm:text-lg text-white hover:text-white/90 transition-colors whitespace-nowrap"
          >
            英語学習アプリ
          </button>
          {/* 開いている版(作った commit と日時)。どの版を見ているかを確かめるため */}
          <BuildVersion />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LevelBadge />
          <HeaderMenu />
        </div>
      </div>
    </header>
  );
}
