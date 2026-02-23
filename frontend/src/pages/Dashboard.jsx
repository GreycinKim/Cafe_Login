import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { ledger } from "../api/endpoints";
import Modal from "../components/Modal";

const CATEGORIES = [
  { value: "sales", label: "Sales" },
  { value: "expense", label: "Expense" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "ministry_fund", label: "College Ministry Fund" },
  { value: "offering", label: "Offering" },
];

function formatCurrency(val) {
  if (val == null || val === 0) return "";
  return `$${Number(val).toFixed(2)}`;
}

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}


export default function Dashboard() {
  const { user } = useAuth();
  const [range, setRange] = useState(getMonthRange);
  const [summary, setSummary] = useState({ rows: [], totals: null });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    category: "sales",
    amount: "",
    description: "",
    label: "",
  });
  const [submitError, setSubmitError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ledger.dailySummary(range.start, range.end);
      setSummary({ rows: res.data.rows || [], totals: res.data.totals || null });
    } catch (err) {
      setSummary({ rows: [], totals: null });
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditing(null);
    setForm({
      entry_date: new Date().toISOString().slice(0, 10),
      category: "sales",
      amount: "",
      description: "",
      label: "",
    });
    setSubmitError("");
    setModalOpen(true);
  };

  const openEditModal = async (row) => {
    try {
      const res = await ledger.list(range.start, range.end);
      const entries = (res.data || []).filter(
        (e) => e.status === "approved" && e.entry_date === row.date && (e.label || "") === (row.label || "") && e.created_by === row.user_id
      );
      if (entries.length === 0) {
        alert("No individual entries found for this row.");
        return;
      }
      const entry = entries.length === 1 ? entries[0] : entries[0];
      setEditing(entry);
      setForm({
        entry_date: entry.entry_date,
        category: entry.category,
        amount: String(entry.amount ?? ""),
        description: entry.description ?? "",
        label: entry.label ?? "",
      });
      setSubmitError("");
      setModalOpen(true);
    } catch (err) {
      alert("Failed to load entries for editing.");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("Please enter a valid amount.");
      return;
    }

    try {
      if (editing) {
        await ledger.update(editing.id, {
          entry_date: form.entry_date,
          category: form.category,
          amount,
          description: form.description || undefined,
          label: form.label || undefined,
        });
      } else {
        await ledger.create({
          entry_date: form.entry_date,
          category: form.category,
          amount,
          description: form.description || undefined,
          label: form.label || undefined,
        });
      }
      closeModal();
      fetchData();
    } catch (err) {
      setSubmitError(err?.response?.data?.error || "Failed to save entry.");
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete all entries for ${row.date}${row.label ? ` (${row.label})` : ""}?`)) return;
    try {
      const res = await ledger.list(range.start, range.end);
      const entries = (res.data || []).filter(
        (e) => e.status === "approved" && e.entry_date === row.date && (e.label || "") === (row.label || "") && e.created_by === row.user_id
      );
      for (const entry of entries) {
        await ledger.remove(entry.id);
      }
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to delete.");
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">From</label>
            <input
              type="date"
              value={range.start}
              onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">To</label>
            <input
              type="date"
              value={range.end}
              onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm transition-colors"
            >
              <span>+</span> Add Entry
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Label</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Sales</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Expenses</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Reimbursement</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">College Ministry Fund</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Offering</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Net Profit</th>
                  {isAdmin && <th className="w-24 px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {summary.rows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="px-4 py-12 text-center text-slate-500">
                      No entries for this date range.
                    </td>
                  </tr>
                ) : (
                  summary.rows.map((row, idx) => (
                    <tr key={`${row.date}-${row.user_id}-${row.label || ""}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-800">{row.date}</td>
                      <td className="px-4 py-3 text-slate-700">{row.user_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.label || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.sales)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.expenses)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.reimbursement)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.college_ministry_fund)}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(row.offering)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${(row.net_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(row.net_profit)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditModal(row)}
                              className="p-1.5 rounded text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(row)}
                              className="p-1.5 rounded text-slate-500 hover:bg-red-50 hover:text-red-600"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
                {summary.totals && summary.rows.length > 0 && (
                  <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                    <td className="px-4 py-3 text-slate-800" colSpan={3}>Totals</td>
                    <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(summary.totals.sales)}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(summary.totals.expenses)}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(summary.totals.reimbursement)}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(summary.totals.college_ministry_fund)}</td>
                    <td className="px-4 py-3 text-right text-slate-800">{formatCurrency(summary.totals.offering)}</td>
                    <td className={`px-4 py-3 text-right ${(summary.totals.net_profit ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(summary.totals.net_profit)}
                    </td>
                    {isAdmin && <td className="px-4 py-3" />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? "Edit Entry" : "Add Entry"} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              placeholder="0.00"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Label</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Optional"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium">
              {editing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
