import { useEffect, useState } from "react";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";

function Stat({ label, value, accent }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <p className="section-label">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent || "text-slate-900"}`}>
        {Number(value).toLocaleString()}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return <div className="text-slate-500">Loading...</div>;

  const { totals, topApis, topUsers, recentCalls } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Admin Overview</h1>
        <p className="page-subtitle">Platform-wide usage at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Stat label="Users" value={totals.users} />
        <Stat label="APIs" value={totals.apis} />
        <Stat label="Subscriptions" value={totals.subscriptions} />
        <Stat label="Calls today" value={totals.callsToday} accent="text-brand-600" />
        <Stat label="Calls (24h)" value={totals.calls24h} />
        <Stat label="Calls (7d)" value={totals.calls7d} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-flat overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Top APIs</h2>
            <p className="text-xs text-slate-500">By total call volume</p>
          </div>
          {topApis.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No data yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">API</th>
                  <th className="table-th">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topApis.map((r) => (
                  <tr key={r.apiId} className="hover:bg-slate-50">
                    <td className="table-td font-medium">{r.name}</td>
                    <td className="table-td font-medium">{r.calls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card-flat overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Top Users</h2>
            <p className="text-xs text-slate-500">Most active by total calls</p>
          </div>
          {topUsers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">No data yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">User</th>
                  <th className="table-th">Calls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topUsers.map((r) => (
                  <tr key={r.userId} className="hover:bg-slate-50">
                    <td className="table-td">{r.email}</td>
                    <td className="table-td font-medium">{r.calls.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card-flat overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent activity</h2>
          <p className="text-xs text-slate-500">Last 10 platform-wide calls</p>
        </div>
        {recentCalls.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No calls yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Time</th>
                <th className="table-th">User</th>
                <th className="table-th">API</th>
                <th className="table-th">Status</th>
                <th className="table-th">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCalls.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="table-td text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="table-td">{l.user?.email}</td>
                  <td className="table-td font-mono text-xs">{l.api?.slug}</td>
                  <td className="table-td">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="table-td text-slate-500">{l.responseTimeMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
