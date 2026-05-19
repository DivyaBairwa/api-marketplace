import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

function ProgressBar({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-700 font-medium">
          {value.toLocaleString()} <span className="text-slate-400">/ {total.toLocaleString()}</span>
        </span>
        <span className="text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading...</div>;

  const { subscriptions, recentLogs } = data;
  const totalCalls = subscriptions.reduce((a, s) => a + (s.totalPurchased - s.remainingCalls), 0);
  const totalRemaining = subscriptions.reduce((a, s) => a + s.remainingCalls, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your subscribed APIs and recent activity at a glance.</p>
        </div>
        <Link to="/catalog" className="btn-primary self-start">
          + Browse catalog
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <p className="section-label">Active subscriptions</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{subscriptions.length}</p>
        </div>
        <div className="card">
          <p className="section-label">Calls used</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalCalls.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="section-label">Calls remaining</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totalRemaining.toLocaleString()}</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Subscribed APIs</h2>
          {subscriptions.length > 0 && (
            <Link to="/catalog" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              Add another →
            </Link>
          )}
        </div>
        {subscriptions.length === 0 ? (
          <div className="card text-center py-12">
            <div className="mx-auto w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium">No subscriptions yet</p>
            <p className="text-sm text-slate-500 mt-1">Visit the catalog to subscribe to an API and start making calls.</p>
            <Link to="/catalog" className="btn-primary mt-4 inline-flex">
              Open catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map((s) => (
              <div key={s.id} className="card hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{s.api.name}</h3>
                    <p className="mt-0.5 text-xs font-mono text-slate-500">
                      <span className="badge bg-slate-100 text-slate-700 mr-1">{s.api.method}</span>
                      {s.api.endpoint}
                    </p>
                  </div>
                  <Link to="/catalog" className="text-xs text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap ml-2">
                    Top up
                  </Link>
                </div>
                <div className="mt-4">
                  <ProgressBar value={s.remainingCalls} total={s.totalPurchased} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Recent activity</h2>
        <div className="card-flat overflow-hidden">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No calls yet. Use your API key to make your first request.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">When</th>
                  <th className="table-th">API</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="table-td text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="table-td font-mono text-xs">{l.api?.slug}</td>
                    <td className="table-td">
                      <StatusBadge status={l.status} />
                      {l.errorReason && (
                        <span className="ml-2 text-xs text-slate-500">{l.errorReason}</span>
                      )}
                    </td>
                    <td className="table-td text-slate-500">{l.responseTimeMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
