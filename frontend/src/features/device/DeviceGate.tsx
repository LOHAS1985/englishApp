import { useEffect, useState } from "react";
import { DEVICE_REGISTRATION_REQUIRED_EVENT, registerDevice, saveDeviceToken } from "../../api/client";
import { guessDeviceName } from "./deviceName";

/**
 * サーバーが「この端末は登録されていない」と返したら、登録画面を重ねて表示する。
 * 合言葉(サーバーの APP_ACCESS_KEY)で登録すると端末専用の鍵が発行され、この端末のブラウザに保存される。
 * 登録できるのは最大3台(サーバーの MAX_DEVICES)。
 */
export default function DeviceGate() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState(guessDeviceName);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(DEVICE_REGISTRATION_REQUIRED_EVENT, show);
    return () => window.removeEventListener(DEVICE_REGISTRATION_REQUIRED_EVENT, show);
  }, []);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { token } = await registerDevice(key.trim(), name.trim());
      if (!saveDeviceToken(token)) {
        setError("このブラウザには登録情報を保存できません(プライベートモードなど)。通常のモードで開いてください");
        return;
      }
      // 失敗した読み込みをやり直すため、画面ごと読み込み直す
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "端末の登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-slate-800">この端末を登録してください</h2>
        <p className="mt-2 text-sm text-slate-600">
          登録した端末(最大3台)だけが使えます。登録は端末ごとに1回だけです。
        </p>
        <label className="mt-4 block text-sm text-slate-700">
          合言葉
          <input
            type="password"
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            autoComplete="current-password"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-700">
          端末の名前(マイページで見分けるため)
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="mt-3 text-sm text-[#c0392b]">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 w-full rounded bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600 disabled:bg-slate-400"
        >
          {submitting ? "登録中…" : "登録する"}
        </button>
      </form>
    </div>
  );
}
