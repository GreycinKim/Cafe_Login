import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { activity as activityApi } from "../api/endpoints";
import { users as usersApi } from "../api/endpoints";

function formatDateTime(val) {
  if (!val) return "—";
  const d = new Date(val);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

function actionLabel(action) {
  const map = {
    "ledger.create": "Created ledger entry",
    "ledger.update": "Updated ledger entry",
    "ledger.delete": "Deleted ledger entry",
    "receipt.upload": "Uploaded receipt",
    "receipt.update": "Updated receipt",
    "reimbursement.create": "Requested reimbursement",
    "reimbursement.approve": "Approved reimbursement",
    "reimbursement.reject": "Rejected reimbursement",
    "recipe.create": "Created drink",
    "recipe.update": "Updated drink",
    "recipe.delete": "Deleted drink",
    "inventory.create": "Added inventory item",
    "inventory.update": "Updated inventory item",
    "inventory.delete": "Removed inventory item",
    "user.create": "Created user",
    "user.update": "Updated user",
    "user.deactivate": "Deactivated user",
  };
  return map[action] || action;
}

export default function Activity() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start: "",
    end: "",
    entity_type: "",
    user_id: "",
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.start) params.start = filters.start;
      if (filters.end) params.end = filters.end;
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.user_id && isAdmin) params.user_id = filters.user_id;
      const res = await activityApi.list(params);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters.start, filters.end, filters.entity_type, filters.user_id, isAdmin]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!isAdmin) return;
    usersApi
      .list()
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
        <p className="text-sm text-slate-500">
          {isAdmin ? "All user actions" : "Your recent actions"}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={filters.start}
            onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={filters.end}
            onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select
            value={filters.entity_type}
            onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="ledger">Ledger</option>
            <option value="receipt">Receipt</option>
            <option value="reimbursement">Reimbursement</option>
            <option value="recipe">Drink</option>
            <option value="inventory">Inventory</option>
            <option value="user">User</option>
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">User</label>
            <select
              value={filters.user_id}
              onChange={(e) => setFilters((f) => ({ ...f, user_id: e.target.value }))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <svg
              className="animate-spin h-10 w-10 text-primary-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">No activity recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">When</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>}
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 font-medium text-slate-800">{log.user_name || "—"}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
