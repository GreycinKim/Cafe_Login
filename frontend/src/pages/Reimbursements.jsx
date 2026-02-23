import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { reimbursements } from "../api/endpoints";
import Modal from "../components/Modal";

function formatCurrency(val) {
  if (val == null || val === "") return "";
  return `$${Number(val).toFixed(2)}`;
}

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString();
}

function StatusBadge({ status }) {
  const styles = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-slate-100 text-slate-700"}`}>
      {label}
    </span>
  );
}

export default function Reimbursements() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [mine, setMine] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    amount: "",
    description: "",
    label: "",
    notes: "",
  });
  const [formError, setFormError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mineRes, pendingRes] = await Promise.all([
        reimbursements.mine(),
        isAdmin ? reimbursements.pending() : Promise.resolve({ data: [] }),
      ]);
      setMine(mineRes.data || []);
      setPending(isAdmin ? (pendingRes.data || []) : []);
    } catch (err) {
      setMine([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openForm = () => {
    setForm({
      entry_date: new Date().toISOString().slice(0, 10),
      amount: "",
      description: "",
      label: "",
      notes: "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => setFormOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("Please enter a valid amount.");
      return;
    }
    try {
      await reimbursements.create({
        entry_date: form.entry_date,
        amount,
        description: form.description?.trim() || undefined,
        label: form.label?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });
      closeForm();
      fetchData();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to submit reimbursement.");
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await reimbursements.approve(id);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to approve.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await reimbursements.reject(id);
      fetchData();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to reject.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Reimbursements</h1>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm transition-colors"
        >
          <span>+</span> Submit Reimbursement
        </button>
      </div>

      {/* Pending Queue (Admin only) */}
      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Pending Queue</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {pending.length === 0 ? (
              <div className="px-4 py-12 text-center text-slate-500">No pending reimbursements.</div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Requester</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Description</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Label</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Notes</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-800 font-medium">{r.requester_name || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{r.ledger_entry?.entry_date || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{r.ledger_entry?.description || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-800 font-medium">{formatCurrency(r.ledger_entry?.amount)}</td>
                      <td className="px-4 py-3 text-slate-700">{r.ledger_entry?.label || "—"}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={r.notes}>{r.notes || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
                          >
                            {actionLoading === r.id ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(r.id)}
                            disabled={actionLoading === r.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium disabled:opacity-50"
                          >
                            Reject
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
        </section>
      )}

      {/* My Reimbursements */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">My Requests</h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : mine.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500">No reimbursement requests yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Description</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-700">Amount</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Label</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Payout Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-800">{r.ledger_entry?.entry_date || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{r.ledger_entry?.description || "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-800 font-medium">{formatCurrency(r.ledger_entry?.amount)}</td>
                      <td className="px-4 py-3 text-slate-700">{r.ledger_entry?.label || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(r.payout_date)}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Submit Form Modal */}
      <Modal open={formOpen} onClose={closeForm} title="Submit Reimbursement">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Entry Date</label>
            <input
              type="date"
              value={form.entry_date}
              onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
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
              placeholder="What was this expense for?"
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeForm} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium">
              Submit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
