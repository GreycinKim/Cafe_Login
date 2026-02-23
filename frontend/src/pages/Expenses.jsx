import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { receipts, ledger } from "../api/endpoints";
import Modal from "../components/Modal";

const CATEGORIES = [
  { value: "sales", label: "Sales" },
  { value: "expense", label: "Expense" },
  { value: "reimbursement", label: "Reimbursement" },
  { value: "ministry_fund", label: "College Ministry Fund" },
  { value: "offering", label: "Offering" },
];

const STATUS_LABELS = {
  pending: "Pending",
  processed: "Processed",
  failed: "Failed",
};

function formatCurrency(val) {
  if (val == null || val === "") return "";
  return `$${Number(val).toFixed(2)}`;
}

export default function Expenses() {
  const { user } = useAuth();
  const [receiptsList, setReceiptsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState("idle"); // idle | uploading | processing | review | done
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reviewReceipt, setReviewReceipt] = useState(null);
  const [reviewForm, setReviewForm] = useState({ merchant_name: "", transaction_date: "", total_amount: "", category: "expense" });
  const [reviewError, setReviewError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receipts.list();
      setReceiptsList(res.data || []);
    } catch (err) {
      setReceiptsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await receipts.search(q);
      setSearchResults(res.data || []);
    } catch (err) {
      setSearchResults([]);
    }
  };

  const displayReceipts = searchResults !== null ? searchResults : receiptsList;

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploadState("uploading");
    setUploadProgress(0);
    try {
      const res = await receipts.upload(file, (ev) => {
        const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
        setUploadProgress(pct);
      });
      setUploadProgress(100);
      setUploadState("processing");
      const receipt = res.data;
      if (receipt?.ocr_raw || receipt?.merchant_name || receipt?.total_amount) {
        const ocr = receipt.ocr_raw || {};
        const categorySuggestion = ocr.category_suggestion || "expense";
        const categoryValue = CATEGORIES.some((c) => c.value === categorySuggestion) ? categorySuggestion : "expense";
        setReviewForm({
          merchant_name: receipt.merchant_name || ocr.merchant_name || "",
          transaction_date: receipt.transaction_date || ocr.transaction_date || new Date().toISOString().slice(0, 10),
          total_amount: receipt.total_amount != null ? String(receipt.total_amount) : (ocr.total_amount != null ? String(ocr.total_amount) : ""),
          category: categoryValue,
        });
        setReviewReceipt(receipt);
        setUploadState("review");
      } else {
        setUploadState("done");
        fetchReceipts();
      }
    } catch (err) {
      setUploadState("idle");
      setUploadProgress(0);
      alert(err?.response?.data?.error || "Upload failed.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e) => {
    const file = e.target?.files?.[0];
    handleFile(file);
    e.target.value = "";
  };

  const closeReview = () => {
    setReviewReceipt(null);
    setUploadState("idle");
    setUploadProgress(0);
    setReviewError("");
    fetchReceipts();
  };

  const handleConfirmSave = async (e) => {
    e.preventDefault();
    setReviewError("");
    const amount = parseFloat(reviewForm.total_amount);
    if (isNaN(amount) || amount <= 0) {
      setReviewError("Please enter a valid amount.");
      return;
    }
    if (!reviewForm.merchant_name?.trim()) {
      setReviewError("Merchant name is required.");
      return;
    }
    try {
      await ledger.create({
        entry_date: reviewForm.transaction_date,
        category: reviewForm.category,
        amount,
        description: reviewForm.merchant_name.trim(),
      });
      if (reviewReceipt?.id) {
        await receipts.update(reviewReceipt.id, {
          merchant_name: reviewForm.merchant_name.trim(),
          transaction_date: reviewForm.transaction_date,
          total_amount: amount,
        });
      }
      closeReview();
    } catch (err) {
      setReviewError(err?.response?.data?.error || "Failed to save.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>

      {/* Drag-and-drop upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          isDragging ? "border-primary-500 bg-primary-50/50" : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
        }`}
      >
        <label className="flex flex-col items-center justify-center py-12 px-6 cursor-pointer min-h-[160px]">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            disabled={uploadState === "uploading" || uploadState === "processing"}
          />
          {uploadState === "idle" && (
            <>
              <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-slate-600 font-medium">Drop receipt image here or click to upload</span>
              <span className="text-slate-500 text-sm mt-1">Accepts image files (PNG, JPG, etc.)</span>
            </>
          )}
          {uploadState === "uploading" && (
            <>
              <div className="w-full max-w-xs mx-auto">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
                <p className="text-sm text-slate-600 mt-2 text-center">Uploading... {uploadProgress}%</p>
              </div>
            </>
          )}
          {uploadState === "processing" && (
            <>
              <svg className="animate-spin w-12 h-12 text-primary-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-slate-600 font-medium">Processing OCR...</span>
            </>
          )}
        </label>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search receipts by description..."
          className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
        />
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium text-sm transition-colors"
        >
          Search
        </button>
        {searchResults !== null && (
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setSearchResults(null); }}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
          >
            Clear
          </button>
        )}
      </form>

      {/* Receipts table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 w-16">Image</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Merchant</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Amount</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </td>
                </tr>
              ) : displayReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {searchResults !== null ? "No search results." : "No receipts yet. Upload one above."}
                  </td>
                </tr>
              ) : (
                displayReceipts.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      {r.image_path ? (
                        <img
                          src={receipts.imageUrl(r.image_path)}
                          alt="Receipt"
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">—</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{r.transaction_date || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{r.uploaded_by_name || "—"}</td>
                    <td className="px-4 py-3 text-slate-800">{r.merchant_name || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-800 font-medium">{formatCurrency(r.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          r.status === "processed"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {STATUS_LABELS[r.status] || r.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Form Modal */}
      <Modal open={uploadState === "review" && !!reviewReceipt} onClose={closeReview} title="Review Receipt" wide>
        <form onSubmit={handleConfirmSave} className="space-y-4">
          {reviewError && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{reviewError}</div>
          )}
          {reviewReceipt?.image_path && (
            <div className="flex justify-center">
              <img
                src={receipts.imageUrl(reviewReceipt.image_path)}
                alt="Receipt preview"
                className="max-h-40 rounded-lg border border-slate-200"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Merchant</label>
            <input
              type="text"
              value={reviewForm.merchant_name}
              onChange={(e) => setReviewForm((f) => ({ ...f, merchant_name: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Date</label>
            <input
              type="date"
              value={reviewForm.transaction_date}
              onChange={(e) => setReviewForm((f) => ({ ...f, transaction_date: e.target.value }))}
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
              value={reviewForm.total_amount}
              onChange={(e) => setReviewForm((f) => ({ ...f, total_amount: e.target.value }))}
              required
              placeholder="0.00"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select
              value={reviewForm.category}
              onChange={(e) => setReviewForm((f) => ({ ...f, category: e.target.value }))}
              required
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={closeReview} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary-700 hover:bg-primary-800 text-white font-medium">
              Confirm & Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
