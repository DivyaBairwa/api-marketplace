import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";

const ICON_BY_SLUG = {
  weather: "🌤️",
  joke: "😄",
  currency: "💱",
  quote: "💬",
  news: "📰",
};

export default function Catalog() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedPackId, setSelectedPackId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  function load() {
    api
      .get("/catalog")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function openBuy(apiItem) {
    setSelected(apiItem);
    setSelectedPackId(apiItem.quotaPacks?.[0]?.id || null);
    setMessage(null);
  }

  async function confirmBuy() {
    if (!selected || !selectedPackId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.post(`/buy/${selected.id}`, { packId: selectedPackId });
      setMessage(res.message);
      load();
    } catch (e) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">API Catalog</h1>
        <p className="page-subtitle">Browse available APIs and pick a quota pack to subscribe or top up.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it) => (
          <div key={it.id} className="card flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between">
              <div className="text-3xl">{ICON_BY_SLUG[it.slug] || "🔌"}</div>
              {it.subscription ? (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Subscribed
                </span>
              ) : (
                <span className="badge bg-slate-100 text-slate-600">
                  {it.quotaPacks?.length || 0} pack{it.quotaPacks?.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <h3 className="mt-3 font-semibold text-slate-900">{it.name}</h3>
            <p className="mt-0.5 text-xs font-mono text-slate-500">
              <span className="badge bg-slate-100 text-slate-700 mr-1">{it.method}</span>
              {it.endpoint}
            </p>
            <p className="text-sm text-slate-600 mt-3 flex-1">{it.description}</p>
            {it.subscription && (
              <p className="mt-3 text-xs text-emerald-700">
                {it.subscription.remainingCalls.toLocaleString()} calls left
              </p>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => openBuy(it)} className="btn-primary w-full">
                {it.subscription ? "Top up" : "Subscribe"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Subscribe to ${selected.name}` : ""}
        footer={
          <>
            <button onClick={() => setSelected(null)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={confirmBuy} disabled={busy || !selectedPackId} className="btn-primary">
              {busy ? "Processing..." : "Confirm purchase"}
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Choose a quota pack:</p>
            <div className="space-y-2">
              {(selected.quotaPacks || []).map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedPackId === p.id
                      ? "border-brand-500 bg-brand-50 ring-4 ring-brand-500/15"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={selectedPackId === p.id}
                      onChange={() => setSelectedPackId(p.id)}
                      className="text-brand-600 focus:ring-brand-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-900">{p.label}</div>
                      <div className="text-xs text-slate-500">{p.calls.toLocaleString()} API calls</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-slate-900">${(p.price / 100).toFixed(2)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">one-time</div>
                  </div>
                </label>
              ))}
            </div>
            {message && (
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  message.startsWith("Error")
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                {message}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
