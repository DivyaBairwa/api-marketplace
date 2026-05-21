import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";

const BACKEND_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const API_PAYLOADS = {
  weather: [
    { name: "city", type: "string", required: true, example: "San Francisco", description: "City name to fetch weather for." },
    { name: "units", type: 'enum { "metric", "imperial" }', required: false, example: "metric", description: "Temperature units. Defaults to metric." },
  ],
  joke: [
    { name: "category", type: 'enum { "programming", "general", "dad" }', required: false, example: "programming", description: "Filter jokes by category." },
  ],
  currency: [
    { name: "base", type: "string", required: true, example: "USD", description: "ISO currency code to use as base." },
    { name: "symbols", type: "array<string>", required: false, example: ["EUR", "GBP", "INR"], description: "Currencies to return rates for. Defaults to all." },
  ],
  quote: [
    { name: "tag", type: "string", required: false, example: "technology", description: "Filter quotes by tag." },
  ],
  news: [
    { name: "category", type: 'enum { "technology", "business", "sports", "health" }', required: false, example: "technology", description: "Headline category." },
    { name: "country", type: "string", required: false, example: "US", description: "ISO country code." },
    { name: "limit", type: "number", required: false, example: 5, description: "Max headlines to return (1-50)." },
  ],
};

function getPayloadFields(slug) {
  return API_PAYLOADS[slug] || [];
}

function buildExamplePayload(slug) {
  const fields = getPayloadFields(slug);
  if (fields.length === 0) return null;
  const out = {};
  for (const f of fields) out[f.name] = f.example;
  return out;
}

function buildCurl(item, key) {
  const payload = buildExamplePayload(item.slug);
  if (payload) {
    const body = JSON.stringify(payload, null, 2)
      .split("\n")
      .map((l, i) => (i === 0 ? l : `  ${l}`))
      .join("\n");
    return [
      `curl -X POST ${BACKEND_BASE}${item.endpoint} \\`,
      `  -H "x-api-key: ${key}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '${body}'`,
    ].join("\n");
  }
  const method = (item.method || "GET").toUpperCase();
  const methodFlag = method === "GET" ? "" : `-X ${method} `;
  return `curl ${methodFlag}${BACKEND_BASE}${item.endpoint} \\\n  -H "x-api-key: ${key}"`;
}

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
  const [copiedCurl, setCopiedCurl] = useState(null);
  const toast = useToast();

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
      toast.success("API key regenerated. All curl examples below now use the new key.");
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCurl(slug, text) {
    await navigator.clipboard.writeText(text);
    setCopiedCurl(slug);
    setTimeout(() => setCopiedCurl((s) => (s === slug ? null : s)), 1500);
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
      const payload = buildExamplePayload(selectedSlug);
      const res = await fetch(`${BACKEND_BASE}/v1/${selectedSlug}`, {
        method: payload ? "POST" : "GET",
        headers: {
          "x-api-key": apiKey,
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
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

      <div className="space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">API documentation</h2>
          <p className="text-xs text-slate-500 mt-1">
            Reference for every API you're subscribed to. Curls are bound to your live key — regenerate
            it above and these examples update instantly.
          </p>
        </div>

        {catalog.length === 0 ? (
          <div className="card text-sm text-slate-600">
            Subscribe to an API from the catalog to see its documentation here.
          </div>
        ) : (
          catalog.map((item) => {
            const displayKey = reveal ? apiKey || "<your-key>" : "<your-key>";
            const realCurl = buildCurl(item, apiKey || "<your-key>");
            const shownCurl = buildCurl(item, displayKey);
            const payloadFields = getPayloadFields(item.slug);
            const effectiveMethod = payloadFields.length > 0 ? "POST" : (item.method || "GET").toUpperCase();
            return (
              <div key={item.id} className="card space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>
                      <span className="badge bg-slate-100 text-slate-700">{effectiveMethod}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-mono text-slate-500">{item.endpoint}</p>
                    {item.description && (
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    )}
                  </div>
                  {item.subscription && (
                    <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                      {item.subscription.remainingCalls.toLocaleString()} calls left
                    </span>
                  )}
                </div>

                {payloadFields.length > 0 && (
                  <div>
                    <div className="section-label mb-2">Payload fields</div>
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className="table-th w-1/3">Property</th>
                            <th className="table-th">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {payloadFields.map((f) => (
                            <tr key={f.name}>
                              <td className="table-td align-top">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs text-slate-900">{f.name}</span>
                                  {f.required ? (
                                    <span className="badge bg-red-50 text-red-700 border border-red-200 text-[10px]">required</span>
                                  ) : (
                                    <span className="badge bg-slate-100 text-slate-600 text-[10px]">optional</span>
                                  )}
                                </div>
                                <div className="text-[11px] italic text-emerald-700 mt-0.5">{f.type}</div>
                              </td>
                              <td className="table-td">
                                <div className="text-sm text-slate-700">{f.description}</div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  Example:{" "}
                                  <code className="font-mono text-xs text-slate-700 break-all">
                                    {JSON.stringify(f.example)}
                                  </code>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="section-label">Example request</span>
                    <button
                      className="btn-secondary text-xs"
                      onClick={() => copyCurl(item.slug, realCurl)}
                    >
                      {copiedCurl === item.slug ? "Copied!" : "Copy curl"}
                    </button>
                  </div>
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed">
                    {shownCurl}
                  </pre>
                  {!reveal && (
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      Click "Reveal" above to show the actual key in the snippet — "Copy curl" already copies the real key.
                    </p>
                  )}
                </div>

                {item.dummyResponse && (
                  <div>
                    <div className="section-label mb-2">Sample response</div>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto leading-relaxed">
                      {JSON.stringify(item.dummyResponse, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
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
