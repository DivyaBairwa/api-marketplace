import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";

export default function ApiKey() {
  const [apiKey, setApiKey] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);

  function load() {
    api
      .get("/my-key")
      .then((d) => setApiKey(d.apiKey))
      .catch((e) => setError(e.message));
    api
      .get("/catalog")
      .then((d) => {
        const subscribed = d.items.filter((item) => item.subscription);
        setCatalog(subscribed);
        setSelectedSlug((current) => current || subscribed[0]?.slug || "");
      })
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function regenerate() {
    setBusy(true);
    try {
      const d = await api.post("/regenerate-key");
      setApiKey(d.apiKey);
      setConfirming(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function runTestCall() {
    if (!apiKey || !selectedSlug) return;
    setTestBusy(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch(`/v1/${selectedSlug}`, {
        headers: { "x-api-key": apiKey },
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }
      setTestResult(data);
      load();
    } catch (e) {
      setTestError(e.message);
    } finally {
      setTestBusy(false);
    }
  }

  if (error) return <div className="text-red-600">{error}</div>;

  const selectedApi = catalog.find((item) => item.slug === selectedSlug);

  const masked = apiKey ? apiKey.slice(0, 8) + "•".repeat(40) + apiKey.slice(-4) : "Loading...";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="page-title">API Key</h1>
        <p className="page-subtitle">
          Use this key in the <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">x-api-key</code> header
          on every metered request.
        </p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label">Your secret key</label>
          <div className="flex gap-2">
            <input
              className="input font-mono text-xs"
              value={reveal ? apiKey || "" : masked}
              readOnly
            />
            <button onClick={() => setReveal((r) => !r)} className="btn-secondary text-xs">
              {reveal ? "Hide" : "Reveal"}
            </button>
            <button onClick={copy} className="btn-secondary text-xs">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Treat this like a password — anyone with it can spend your quota.
          </p>
        </div>
        <div className="pt-4 border-t border-slate-100">
          <button onClick={() => setConfirming(true)} className="btn-danger">
            Regenerate key
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Regenerating invalidates the previous key immediately — any clients using it will start returning 401.
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-1">Quick start</h2>
        <p className="text-xs text-slate-500 mb-4">Copy this curl and run it from any terminal.</p>
        <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed">
{`curl -X POST http://localhost:3000/v1/weather \\
  -H "x-api-key: ${reveal ? apiKey || "<your-key>" : "<your-key>"}"`}
        </pre>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Try an API call</h2>
          <p className="text-xs text-slate-500 mt-1">
            Send a real metered request from this page. A successful call will reduce your remaining quota by 1.
          </p>
        </div>

        {catalog.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Subscribe to an API from the catalog before testing calls here.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <label className="label">Subscribed API</label>
                <select
                  className="input"
                  value={selectedSlug}
                  onChange={(e) => {
                    setSelectedSlug(e.target.value);
                    setTestResult(null);
                    setTestError(null);
                  }}
                >
                  {catalog.map((item) => (
                    <option key={item.id} value={item.slug}>
                      {item.name} ({item.subscription.remainingCalls.toLocaleString()} left)
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" onClick={runTestCall} disabled={testBusy || !apiKey || !selectedSlug}>
                {testBusy ? "Calling..." : "Send test call"}
              </button>
            </div>

            {selectedApi && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <span>
                    <span className="text-slate-500">Endpoint:</span>{" "}
                    <code className="font-mono text-xs">{selectedApi.endpoint}</code>
                  </span>
                  <span>
                    <span className="text-slate-500">Remaining:</span>{" "}
                    <strong>{selectedApi.subscription.remainingCalls.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
            )}

            {testError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {testError}
              </div>
            )}

            {testResult && (
              <div>
                <label className="label">Response</label>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Regenerate API key?"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirming(false)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={regenerate} disabled={busy}>
              {busy ? "Regenerating..." : "Yes, regenerate"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            ⚠ This action is immediate and cannot be undone.
          </div>
          <p className="text-sm text-slate-700">
            Your current key will stop working right after you confirm. Clients using it will get a{" "}
            <code className="font-mono text-xs">401 invalid_api_key</code> error until you update them.
          </p>
        </div>
      </Modal>
    </div>
  );
}
