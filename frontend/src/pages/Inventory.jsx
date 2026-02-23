import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { inventory as inventoryApi } from "../api/endpoints";
import Modal from "../components/Modal";

function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export default function Inventory() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: "", quantity: "", unit: "" });
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.list();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      quantity: String(item.quantity ?? ""),
      unit: item.unit || "",
    });
    setError("");
    setEditModalOpen(true);
  };

  const openAdd = () => {
    setForm({ name: "", quantity: "", unit: "" });
    setError("");
    setAddModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty < 0) {
      setError("Enter a valid quantity.");
      return;
    }
    try {
      await inventoryApi.update(editingItem.id, {
        name: form.name.trim() || undefined,
        quantity: qty,
        unit: form.unit.trim() || undefined,
      });
      setEditModalOpen(false);
      setEditingItem(null);
      fetchItems();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to update.");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const name = form.name.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty < 0) {
      setError("Enter a valid quantity.");
      return;
    }
    try {
      await inventoryApi.create({
        name,
        quantity: qty,
        unit: form.unit.trim() || undefined,
      });
      setAddModalOpen(false);
      fetchItems();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to add item.");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Remove "${item.name}" from inventory?`)) return;
    try {
      await inventoryApi.remove(item.id);
      fetchItems();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Editable counts. New receipts add items from OCR automatically.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm"
        >
          <span>+</span> Add Item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            No inventory items yet. Add items manually or scan receipts to add from OCR.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Quantity</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Unit</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Last edited by</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Last edited at</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{Number(item.quantity)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.unit || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.last_edited_by_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDateTime(item.last_edited_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingItem(null); }} title="Edit inventory item">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit (optional)</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="e.g. oz, lb"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium">Save</button>
          </div>
        </form>
      </Modal>

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add inventory item">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Item name"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
            <input
              type="number"
              step="any"
              min="0"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              required
              placeholder="0"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit (optional)</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="e.g. oz, lb"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium">Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
