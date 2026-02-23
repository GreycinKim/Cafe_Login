import { useState, useEffect, useCallback } from "react";
import { analytics } from "../api/endpoints";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatCurrency(val) {
  if (val == null || val === "") return "$0.00";
  return `$${Number(val).toFixed(2)}`;
}

export default function Analytics() {
  const [range, setRange] = useState(getMonthRange);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analytics.summary(range.start, range.end);
      setSummary(res.data?.data ?? res.data ?? null);
    } catch (err) {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const trend = summary?.trend ?? [];
  const lineData = trend.map((t) => ({
    date: t.date,
    sales: Number(t.sales ?? 0),
    expenses: Number(t.expenses ?? 0),
  }));

  const barData = [
    { name: "Sales", value: Number(summary?.total_sales ?? 0), fill: "#009CDE" },
    { name: "Expenses", value: Number(summary?.total_expenses ?? 0), fill: "#ef4444" },
    { name: "Reimbursements", value: Number(summary?.total_reimbursements ?? 0), fill: "#8b5cf6" },
    { name: "Ministry Fund", value: Number(summary?.total_ministry_fund ?? 0), fill: "#f59e0b" },
    { name: "Offering", value: Number(summary?.total_offering ?? 0), fill: "#10b981" },
  ].filter((d) => d.value > 0);

  const netProfit = Number(summary?.net_profit ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600">From</label>
          <input
            type="date"
            value={range.start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <label className="text-sm font-medium text-slate-600">To</label>
          <input
            type="date"
            value={range.end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

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
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Total Sales
              </p>
              <p className="mt-1 text-2xl font-bold text-primary-500">
                {formatCurrency(summary?.total_sales)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Total Expenses
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600">
                {formatCurrency(summary?.total_expenses)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Net Profit
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  netProfit >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary?.net_profit)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Reimbursement Count
              </p>
              <p className="mt-1 text-2xl font-bold text-purple-600">
                {summary?.reimbursement_count ?? 0}
              </p>
            </div>
          </div>

          {/* Line Chart - Sales vs Expenses over time */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Sales vs Expenses Over Time
            </h3>
            <div className="h-80">
              {lineData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No trend data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), ""]}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Sales"
                      stroke="#009CDE"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bar Chart - Category breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Category Breakdown
            </h3>
            <div className="h-80">
              {barData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No category data for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#64748b"
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value), ""]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
