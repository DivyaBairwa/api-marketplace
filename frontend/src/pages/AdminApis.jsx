import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Modal } from "../components/Modal";

const EMPTY = {
  name: "",
  slug: "",
  description: "",
  method: "GET",
  pricePerQuota: 100,
  quotaAmount: 1000,
  quotaPacks: [
    { id: "starter", label: "Starter", calls: 1000, price: 100 },
    { id: "pro", label: "Pro", calls: 10000, price: 800 },
  ],
  dummyResponse: { hello: "world" },
  isActive: true,
};

function PackEditor({ packs, onChange }) {
  function update(i, k, v) {
    const next = packs.slice();
    next[i] = { ...next[i], [k]: k === "calls" || k === "price" ? Number(v) : v };
    onChange(next);
  }
  function remove(i) {
    onChange(packs.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...packs, { id: `pack-${packs.length + 1}`, label: "New", calls: 1000, price: 100 }]);
  }
  return (
    <div className="space-y-2">
      {packs.map((p, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-3">
            <label className="label text-xs">ID</label>
            <input className="input text-xs" value={p.id} onChange={(e) => update(i, "id", e.target.value)} />
          </div>
          <div className="col-span-3">
            <label className="label text-xs">Label</label>
            <input className="input text-xs" value={p.label} onChange={(e) => update(i, "label", e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="label text-xs">Calls</label>
            <input
              type="number"
              className="input text-xs"
              value={p.calls}
              onChange={(e) => update(i, "calls", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label className="label text-xs">Price (¢)</label>
            <input
              type="number"
              className="input text-xs"
              value={p.price}
              onChange={(e) => update(i, "price", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <button onClick={() => remove(i)} className="btn-secondary w-full text-xs">
              Remove
            </button>
          </div>
        </div>
      ))}
      <button onClick={add} className="btn-secondary text-xs">
        + Add pack
      </button>
    </div>
  );
}

export default function AdminApis() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function load() {
    api
      .get("/catalog")
      .then((d) => setItems(d.items))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  function openNew() {
    setEditing("new");
    setForm(EMPTY);
  }
  function openEdit(item) {
    setEditing(item.id);
    setForm({
      name: item.name,
      slug: item.slug,
      description: item.description,
      method: item.method,
      pricePerQuota: item.pricePerQuota,
      quotaAmount: item.quotaAmount,
      quotaPacks: item.quotaPacks || [],
      dummyResponse: item.dummyResponse || {},
      isActive: true,
    });
  }

  async function save() {
    setBusy(true);
    try {
      let dummy = form.dummyResponse;
      if (typeof dummy === "string") {
        try {
          dummy = JSON.parse(dummy);
        } catch {
          throw new Error("dummyResponse must be valid JSON");
        }
      }
      const payload = { ...form, dummyResponse: dummy };
      if (editing === "new") {
        await api.post("/admin/api", payload);
      } else {
        await api.put(`/admin/api/${editing}`, payload);
      }
      setEditing(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    setBusy(true);
    try {
      await api.delete(`/admin/api/${confirmDelete.id}`);
      setConfirmDelete(null);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="page-title">Manage APIs</h1>
          <p className="page-subtitle">Create, edit, and remove APIs from the marketplace catalog.</p>
        </div>
        <button className="btn-primary self-start" onClick={openNew}>
          + New API
        </button>
      </div>

      <div className="card-flat overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Slug</th>
              <th className="table-th">Method</th>
              <th className="table-th">Packs</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">{it.name}</td>
                <td className="table-td font-mono text-xs">{it.slug}</td>
                <td className="table-td">
                  <span className="badge bg-slate-100 text-slate-700">{it.method}</span>
                </td>
                <td className="table-td text-slate-500">{it.quotaPacks?.length || 0}</td>
                <td className="table-td">
                  <div className="flex gap-2 justify-end">
                    <button className="btn-secondary text-xs" onClick={() => openEdit(it)}>
                      Edit
                    </button>
                    <button className="btn-danger text-xs" onClick={() => setConfirmDelete(it)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New API" : "Edit API"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save} disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Slug</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="e.g. weather"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows="2"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
            </div>
            <div>
              <label className="label">Price/quota (¢)</label>
              <input
                type="number"
                className="input"
                value={form.pricePerQuota}
                onChange={(e) => setForm({ ...form, pricePerQuota: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className="label">Quota packs</label>
            <PackEditor packs={form.quotaPacks} onChange={(packs) => setForm({ ...form, quotaPacks: packs })} />
          </div>
          <div>
            <label className="label">Dummy response (JSON)</label>
            <textarea
              className="input font-mono text-xs"
              rows="5"
              value={
                typeof form.dummyResponse === "string"
                  ? form.dummyResponse
                  : JSON.stringify(form.dummyResponse, null, 2)
              }
              onChange={(e) => setForm({ ...form, dummyResponse: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete API?"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={doDelete} disabled={busy}>
              {busy ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p className="text-sm">
          This will delete <strong>{confirmDelete?.name}</strong>, all subscriptions to it, and all logs. This action is
          irreversible.
        </p>
      </Modal>
    </div>
  );
}
