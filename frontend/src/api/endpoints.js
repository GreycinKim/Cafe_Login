import api, { apiBase } from "./client";

export const auth = {
  login: (username, password) => api.post("/auth/login", { username, password }),
  me: () => api.get("/auth/me"),
  seedAdmin: (data) => api.post("/auth/seed-admin", data),
};

export const users = {
  list: () => api.get("/users/"),
  create: (data) => api.post("/users/", data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
};

export const receipts = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/receipts/upload", form, {
      headers: { "Content-Type": undefined },
      onUploadProgress: onProgress,
    });
  },
  list: () => api.get("/receipts/"),
  update: (id, data) => api.patch(`/receipts/${id}`, data),
  search: (q) => api.get(`/receipts/search?q=${encodeURIComponent(q)}`),
  imageUrl: (filename) => `${apiBase ? apiBase + "/api" : "/api"}/receipts/image/${filename}`,
};

export const ledger = {
  create: (data) => api.post("/ledger/", data),
  list: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return api.get(`/ledger/?${params}`);
  },
  dailySummary: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return api.get(`/ledger/daily-summary?${params}`);
  },
  update: (id, data) => api.patch(`/ledger/${id}`, data),
  remove: (id) => api.delete(`/ledger/${id}`),
};

export const reimbursements = {
  create: (data) => api.post("/reimbursements/", data),
  mine: () => api.get("/reimbursements/mine"),
  pending: () => api.get("/reimbursements/pending"),
  approve: (id) => api.post(`/reimbursements/${id}/approve`),
  reject: (id) => api.post(`/reimbursements/${id}/reject`),
};

export const recipes = {
  list: (category) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : "";
    return api.get(`/recipes/${params}`);
  },
  create: (formData) =>
    api.post("/recipes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, data) => api.patch(`/recipes/${id}`, data),
  remove: (id) => api.delete(`/recipes/${id}`),
};

export const analytics = {
  summary: (start, end) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return api.get(`/analytics/summary?${params}`);
  },
};

export const activity = {
  list: (params = {}) => {
    const q = new URLSearchParams(params);
    return api.get(`/activity/?${q}`);
  },
};

export const inventory = {
  list: () => api.get("/inventory/"),
  create: (data) => api.post("/inventory/", data),
  update: (id, data) => api.patch(`/inventory/${id}`, data),
  remove: (id) => api.delete(`/inventory/${id}`),
};
