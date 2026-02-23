import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import { users as usersApi } from "../../api/endpoints";
import Modal from "../../components/Modal";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "worker", label: "Worker" },
];

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString();
  } catch {
    return val;
  }
}

export default function Users() {
  const { user } = useAuth();
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "worker",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    role: "worker",
    password: "",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const isAdmin = user?.role === "admin";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      const data = res.data?.data ?? res.data ?? [];
      setUserList(Array.isArray(data) ? data : []);
    } catch (err) {
      setUserList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAddModal = () => {
    setAddForm({ name: "", email: "", password: "", role: "worker" });
    setFormError("");
    setAddModalOpen(true);
  };

  const closeAddModal = () => setAddModalOpen(false);

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || "",
      role: u.role || "worker",
      password: "",
    });
    setFormError("");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingUser(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const name = addForm.name?.trim();
    const email = addForm.email?.trim();
    const password = addForm.password;

    if (!name || !email) {
      setFormError("Name and email are required.");
      setSubmitting(false);
      return;
    }
    if (!password || password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      setSubmitting(false);
      return;
    }

    try {
      await usersApi.create({ name, email, password, role: addForm.role });
      closeAddModal();
      fetchUsers();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const name = editForm.name?.trim();
    if (!name) {
      setFormError("Name is required.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        name,
        role: editForm.role,
      };
      if (editForm.password?.trim()) {
        payload.password = editForm.password.trim();
      }
      await usersApi.update(editingUser.id, payload);
      closeEditModal();
      fetchUsers();
    } catch (err) {
      setFormError(err?.response?.data?.error || "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate user "${u.name}"? They will no longer be able to log in.`)) return;
    setActionLoading(u.id);
    try {
      await usersApi.remove(u.id);
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to deactivate user.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (u) => {
    setActionLoading(u.id);
    try {
      await usersApi.update(u.id, { is_active: true });
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.error || "Failed to activate user.");
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-16 text-center text-slate-600">
        <p className="font-medium">Access denied.</p>
        <p className="text-sm mt-1">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm transition-colors shadow-sm"
        >
          <span className="text-lg font-semibold">+</span>
          New User
        </button>
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
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Created</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  userList.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{u.name || "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{u.email || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-primary-100 text-primary-800"
                          }`}
                        >
                          {u.role || "worker"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                            u.is_active !== false
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {u.is_active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(u.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            title="Edit"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                              />
                            </svg>
                          </button>
                          {u.is_active !== false ? (
                            <button
                              onClick={() => handleDeactivate(u)}
                              disabled={actionLoading === u.id}
                              className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                              title="Deactivate"
                            >
                              {actionLoading === u.id ? (
                                <svg
                                  className="animate-spin w-4 h-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(u)}
                              disabled={actionLoading === u.id}
                              className="p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-60"
                              title="Activate"
                            >
                              {actionLoading === u.id ? (
                                <svg
                                  className="animate-spin w-4 h-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal open={addModalOpen} onClose={closeAddModal} title="New User">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={addForm.name}
              onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Full name"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              required
              placeholder="user@example.com"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={addForm.password}
              onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={addForm.role}
              onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeAddModal}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={editModalOpen} onClose={closeEditModal} title="Edit User">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          {editingUser && (
            <p className="text-sm text-slate-600">Editing: {editingUser.email}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Full name"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Password (optional)
            </label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              minLength={6}
              placeholder="Leave blank to keep current"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
