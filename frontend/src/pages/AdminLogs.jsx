import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Pagination } from "../components/Pagination";
import { StatusBadge } from "../components/StatusBadge";

const STATUS_OPTIONS = [200, 401, 403, 404, 429, 500];

export default function AdminLogs() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [filters, setFilters] = useState({ apiId: "", userId: "", status: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/catalog")
      .then((d) => setApis(d.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/logs", { page, pageSize: 20, ...filters })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, filters]);

  function update(k, v) {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function exportCsv() {
    return api.downloadCsv("/admin/logs.csv", filters, `admin-logs-${Date.now()}.csv`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="page-title">All Call Logs</h1>
          <p className="page-subtitle">Every metered request across all users — filter, drill in, export.</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary self-start">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
            <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="label">API</label>
          <select className="input" value={filters.apiId} onChange={(e) => update("apiId", e.target.value)}>
            <option value="">All</option>
            {apis.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">User ID</label>
          <input className="input" value={filters.userId} onChange={(e) => update("userId", e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status} onChange={(e) => update("status", e.target.value)}>
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input
            type="datetime-local"
            className="input"
            value={filters.from}
            onChange={(e) => update("from", e.target.value)}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="datetime-local"
            className="input"
            value={filters.to}
            onChange={(e) => update("to", e.target.value)}
          />
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : data.items.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">No logs match these filters.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Time</th>
                <th className="table-th">User</th>
                <th className="table-th">API</th>
                <th className="table-th">Status</th>
                <th className="table-th">Latency</th>
                <th className="table-th">IP</th>
                <th className="table-th">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="table-td text-slate-500">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="table-td">{l.user?.email}</td>
                  <td className="table-td font-mono text-xs">{l.api?.slug}</td>
                  <td className="table-td">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="table-td text-slate-500">{l.responseTimeMs} ms</td>
                  <td className="table-td text-slate-500 font-mono text-xs">{l.ipAddress}</td>
                  <td className="table-td text-slate-500 text-xs">{l.errorReason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </div>
  );
}
