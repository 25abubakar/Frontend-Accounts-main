import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2, BarChart3, Download, Search, X, AlertCircle,
  RefreshCw, CheckCircle2, Briefcase, MapPin,
} from "lucide-react";
import * as XLSX from "xlsx";
import { positionApi, type PositionReport } from "../api/positionApi";
import { containerVariants, itemVariants } from "../utils/orgGroupTreeDesign";

// ── helpers ───────────────────────────────────────────────────────────────
function exportToExcel(data: PositionReport[], filename = "positions-report") {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportToCSV(data: PositionReport[], filename = "positions-report") {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row => headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [report, setReport] = useState<PositionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true); setApiError(null);
      const data = await positionApi.getReport();
      setReport(data);
    } catch {
      setApiError("Unable to load report data.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Derive columns from first row
  const columns = report.length > 0 ? Object.keys(report[0]) : [];

  // Filter rows
  const filtered = report.filter(row => {
    if (!query) return true;
    const q = query.toLowerCase();
    return columns.some(col => String(row[col] ?? "").toLowerCase().includes(q));
  });

  // Stats
  const total = report.length;
  const filled = report.filter(r => String(r.status ?? r.Status ?? r.isFilled ?? "").toLowerCase().includes("fill") || r.isFilled === true).length;
  const vacant = total - filled;

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 size={36} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Positions Report</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-400">
            Full breakdown — Country · Company · Branch · Vacancy · Employee
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchReport}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => exportToCSV(filtered)}
            disabled={!filtered.length}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Download size={15} /> CSV
          </button>
          <button
            onClick={() => exportToExcel(filtered)}
            disabled={!filtered.length}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Download size={15} /> Excel
          </button>
        </div>
      </div>

      {apiError && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <AlertCircle size={16} /> {apiError}
        </div>
      )}

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total Positions", value: total, icon: BarChart3, color: "bg-violet-500", text: "text-violet-500" },
          { label: "Filled",          value: filled, icon: CheckCircle2, color: "bg-emerald-500", text: "text-emerald-500" },
          { label: "Vacant",          value: vacant, icon: Briefcase, color: "bg-amber-500", text: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color, text }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${color}`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                <p className="mt-1.5 text-3xl font-black text-slate-800">{value}</p>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} bg-opacity-10`}>
                <Icon size={22} className={text} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-5 relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search across all columns…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10"
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Table */}
      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 size={48} className="text-slate-200 mb-4" strokeWidth={1.5} />
          <h3 className="text-sm font-black text-slate-700">No report data</h3>
          <p className="mt-1 text-xs font-medium text-slate-400">Add positions and register staff to see data here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-slate-500">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="border-b border-slate-200 px-5 py-4">
                      {col.replace(/([A-Z])/g, " $1").trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="bg-white">
                {filtered.map((row, idx) => (
                  <motion.tr key={idx} variants={itemVariants}
                    className="group transition-colors hover:bg-violet-50/30">
                    {columns.map(col => {
                      const val = row[col];
                      // Status column — color it
                      if (col.toLowerCase().includes("status") || col.toLowerCase().includes("isfilled")) {
                        const isFilled = val === true || String(val).toLowerCase().includes("fill");
                        return (
                          <td key={col} className="border-b border-slate-100 px-5 py-3.5">
                            {isFilled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600 ring-1 ring-inset ring-emerald-500/10">
                                <CheckCircle2 size={10} /> Filled
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-600 ring-1 ring-inset ring-amber-500/10">
                                <Briefcase size={10} /> Vacant
                              </span>
                            )}
                          </td>
                        );
                      }
                      // VacancyCode column
                      if (col.toLowerCase().includes("vacancycode") || col.toLowerCase().includes("code")) {
                        return (
                          <td key={col} className="border-b border-slate-100 px-5 py-3.5">
                            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                              {String(val ?? "—")}
                            </span>
                          </td>
                        );
                      }
                      // Location columns
                      if (col.toLowerCase().includes("branch") || col.toLowerCase().includes("country") || col.toLowerCase().includes("company")) {
                        return (
                          <td key={col} className="border-b border-slate-100 px-5 py-3.5">
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                              <MapPin size={10} className="text-slate-400 shrink-0" />
                              {String(val ?? "—")}
                            </div>
                          </td>
                        );
                      }
                      // Date columns
                      if (col.toLowerCase().includes("date") && val) {
                        return (
                          <td key={col} className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold text-slate-500">
                            {new Date(String(val)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                        );
                      }
                      return (
                        <td key={col} className="border-b border-slate-100 px-5 py-3.5 text-xs font-semibold text-slate-600">
                          {val !== null && val !== undefined ? String(val) : "—"}
                        </td>
                      );
                    })}
                  </motion.tr>
                ))}

                {filtered.length === 0 && (
                  <motion.tr variants={itemVariants}>
                    <td colSpan={columns.length} className="px-6 py-16 text-center">
                      <p className="text-sm font-black text-slate-600">No results match your search.</p>
                    </td>
                  </motion.tr>
                )}
              </motion.tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-3 text-right text-[11px] font-bold text-slate-400">
        Showing {filtered.length} of {total} record{total !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
