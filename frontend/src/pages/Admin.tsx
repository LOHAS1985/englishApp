import { useNavigate } from "react-router-dom";
import Header from "../shared/components/Header";
import DeviceSection from "../features/device/DeviceSection";
import AccessLogSection from "./AccessLogSection";

/** 管理画面。英語学習の内容は扱わず、登録済みの端末とアクセス記録だけを確認する */
export default function Admin() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="w-full max-w-[840px] mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-slate-400">ADMIN</p>
            <h1 className="font-serif text-2xl text-slate-900">管理画面</h1>
          </div>
          <button
            onClick={() => navigate("/mypage")}
            className="text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded px-4 py-2 hover:bg-slate-100 transition-colors"
          >
            学習記録へ
          </button>
        </div>

        <DeviceSection />

        <AccessLogSection />
      </main>
    </div>
  );
}
