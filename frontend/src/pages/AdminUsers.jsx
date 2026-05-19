import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";

export default function AdminUsers() {
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [filters, setFilters] = useState({ email: "", role: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [callForm, setCallForm] = useState({ remainingCalls: 0, totalPurchased: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get("/admin/users", { page, pageSize: 20, ...filters })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, filters]);

  function update(k, v) {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  }

  async function openSubscriptions(user) {
    setSelectedUser(user);
    setSubscriptions([]);
    setEditingSub(null);
    setSubsLoading(true);
    try {
      const res = await api.get(`/admin/users/${user.id}/subscriptions`);
      setSubscriptions(res.items);
    } catch (e) {
      alert(e.message);
      setSelectedUser(null);
    } finally {
      setSubsLoading(false);
    }
  }

  function openCallEditor(subscription) {
    setEditingSub(subscription);
    setCallForm({
      remainingCalls: subscription.remainingCalls,
      totalPurchased: subscription.totalPurchased,
    });
  }

  async function saveCalls() {
    if (!editingSub) return;
    setSaving(true);
    try {
      const updated = await api.put(`/admin/subscriptions/${editingSub.id}/calls`, {
        remainingCalls: Number(callForm.remainingCalls),
        totalPurchased: Number(callForm.totalPurchased),
      });
      setSubscriptions((items) => items.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSub(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Users</h1>
        <p className="page-subtitle">All registered accounts with their activity.</p>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Email contains</label>
          <input
            className="input"
            value={filters.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="search..."
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={filters.role} onChange={(e) => update("role", e.target.value)}>
            <option value="">All</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Joined</th>
                <th className="table-th">Subs</th>
                <th className="table-th">Calls</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{u.email}</td>
                  <td className="table-td">
                    <span
                      className={`badge ${
                        u.role === "ADMIN"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="table-td text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="table-td">{u._count.subscriptions}</td>
                  <td className="table-td">{u._count.callLogs.toLocaleString()}</td>
                  <td className="table-td text-right">
                    <button className="btn-secondary text-xs" onClick={() => openSubscriptions(u)}>
                      Update calls
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />

      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? `Update calls for ${selectedUser.email}` : "Update calls"}
        footer={
          <button className="btn-secondary" onClick={() => setSelectedUser(null)}>
            Close
          </button>
        }
      >
        {subsLoading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">This user has no subscriptions yet.</div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((s) => (
              <div key={s.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{s.api.name}</p>
                    <p className="mt-0.5 text-xs font-mono text-slate-500">{s.api.endpoint}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      {s.remainingCalls.toLocaleString()} remaining / {s.totalPurchased.toLocaleString()} purchased
                    </p>
                  </div>
                  <button className="btn-secondary text-xs" onClick={() => openCallEditor(s)}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={!!editingSub}
        onClose={() => setEditingSub(null)}
        title={editingSub ? `Edit ${editingSub.api.name} calls` : "Edit calls"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditingSub(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={saveCalls} disabled={saving}>
              {saving ? "Saving..." : "Save calls"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Remaining calls</label>
            <input
              type="number"
              min="0"
              className="input"
              value={callForm.remainingCalls}
              onChange={(e) => setCallForm({ ...callForm, remainingCalls: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Total purchased calls</label>
            <input
              type="number"
              min="0"
              className="input"
              value={callForm.totalPurchased}
              onChange={(e) => setCallForm({ ...callForm, totalPurchased: e.target.value })}
            />
          </div>
          <p className="text-xs text-slate-500">
            Remaining calls must be less than or equal to total purchased calls.
          </p>
        </div>
      </Modal>
    </div>
  );
}
