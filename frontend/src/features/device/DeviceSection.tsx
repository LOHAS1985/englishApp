import { useEffect, useState } from "react";
import { deleteDevice, fetchDevices, type DeviceView } from "../../api/client";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ja-JP", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** マイページの「登録済みの端末」。使わなくなった端末や心当たりのない端末を削除できる */
export default function DeviceSection() {
  const [devices, setDevices] = useState<DeviceView[] | null>(null);
  const [error, setError] = useState("");

  const load = () =>
    fetchDevices()
      .then(setDevices)
      .catch((e: Error) => setError(e.message));

  useEffect(() => {
    void load();
  }, []);

  const remove = async (d: DeviceView) => {
    const message = d.current
      ? "この端末の登録を削除します。削除すると、この端末で使うには合言葉で登録し直す必要があります。よろしいですか?"
      : `「${d.name}」の登録を削除します。その端末からは使えなくなります。よろしいですか?`;
    if (!window.confirm(message)) return;
    try {
      await deleteDevice(d.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "端末の削除に失敗しました");
    }
  };

  // 端末登録を使っていない(サーバーに合言葉が未設定の)間は一覧が空なので出さない
  if (!error && (!devices || devices.length === 0)) return null;

  return (
    <section className="mb-8">
      <h2 className="font-serif text-xl text-slate-900 mb-1">登録済みの端末</h2>
      <p className="text-xs text-slate-500 mb-3">
        ここにある端末だけがこのアプリを使えます(最大3台)。心当たりのない端末があれば削除してください。
      </p>
      {error && <p className="text-sm text-[#c0392b] mb-2">{error}</p>}
      <div className="bg-white border border-slate-200 rounded-md divide-y divide-slate-100">
        {(devices ?? []).map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-slate-900 truncate">
                {d.name}
                {d.current && (
                  <span className="ml-2 text-xs text-[#6a8a3e] border border-[#8fae4e] rounded px-1.5 py-0.5">
                    この端末
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">
                登録 {formatDate(d.createdAt)}・最終利用 {formatDate(d.lastUsedAt)}
              </p>
            </div>
            <button
              onClick={() => remove(d)}
              className="shrink-0 text-xs text-[#c0392b] border border-slate-200 rounded px-3 py-1.5 hover:border-[#c0392b]"
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
