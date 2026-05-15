import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, AlertCircle, Save, RotateCcw, CheckSquare, Square,
  Shield, ChevronDown, Check, X,
} from "lucide-react";
import { accessApi, type MatrixRow, type FeatureDto } from "../../api/accessApi";
import { orgTreeApi } from "../../api/orgTreeApi";
import type { OrgNode } from "../../types";

// ── helpers ───────────────────────────────────────────────────────────────
function groupByModule(features: FeatureDto[]): Record<string, FeatureDto[]> {
  return features.reduce<Record<string, FeatureDto[]>>((acc, f) => {
    if (!acc[f.module]) acc[f.module] = [];
    acc[f.module].push(f);
    return acc;
  }, {});
}

// Short display label for a feature key
function shortLabel(key: string): string {
  const parts = key.split("_");
  return parts[parts.length - 1].slice(0, 6).toUpperCase();
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DeptMatrixPage() {
  const { deptId } = useParams<{ deptId: string }>();

  const [departments, setDepartments] = useState<OrgNode[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(deptId ?? "");
  const [deptName, setDeptName] = useState<string>("");

  const [features, setFeatures] = useState<FeatureDto[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  // local state: staffId → featureKey → boolean
  const [localPerms, setLocalPerms] = useState<Record<string, Record<string, boolean>>>({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load departments for the selector
  useEffect(() => {
    orgTreeApi.getByLabel("Department").then(nodes => {
      setDepartments(nodes);
      if (!selectedDept && nodes.length > 0) {
        setSelectedDept(String(nodes[0].id));
      }
    }).catch(() => {});
  }, []);

  // When selectedDept changes, update deptName
  useEffect(() => {
    const found = departments.find(d => String(d.id) === selectedDept);
    setDeptName(found?.name ?? selectedDept);
  }, [selectedDept, departments]);

  // Load matrix + features when dept changes
  const loadMatrix = useCallback(async () => {
    if (!selectedDept) return;
    try {
      setLoading(true);
      setError(null);
      const [rows, allFeatures] = await Promise.all([
        accessApi.getDeptMatrix(selectedDept),
        accessApi.getAllFeatures(),
      ]);
      setMatrix(rows);
      setFeatures(allFeatures);

      // Build local state from matrix
      const perms: Record<string, Record<string, boolean>> = {};
      rows.forEach(row => {
        perms[row.staffId] = {};
        row.permissions.forEach(p => {
          perms[row.staffId][p.featureKey] = p.hasAccess;
        });
      });
      setLocalPerms(perms);
    } catch {
      setError("Failed to load permission matrix.");
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  // Toggle a single cell
  const toggleCell = (staffId: string, featureKey: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [staffId]: {
        ...prev[staffId],
        [featureKey]: !prev[staffId]?.[featureKey],
      },
    }));
  };

  // Select all for a row
  const selectAllRow = (staffId: string) => {
    const newRow: Record<string, boolean> = {};
    features.forEach(f => { newRow[f.featureKey] = true; });
    setLocalPerms(prev => ({ ...prev, [staffId]: newRow }));
  };

  // Clear all for a row
  const clearRow = (staffId: string) => {
    const newRow: Record<string, boolean> = {};
    features.forEach(f => { newRow[f.featureKey] = false; });
    setLocalPerms(prev => ({ ...prev, [staffId]: newRow }));
  };

  // Select all (entire grid)
  const selectAll = () => {
    const newPerms: Record<string, Record<string, boolean>> = {};
    matrix.forEach(row => {
      newPerms[row.staffId] = {};
      features.forEach(f => { newPerms[row.staffId][f.featureKey] = true; });
    });
    setLocalPerms(newPerms);
  };

  // Clear all (entire grid)
  const clearAll = () => {
    const newPerms: Record<string, Record<string, boolean>> = {};
    matrix.forEach(row => {
      newPerms[row.staffId] = {};
      features.forEach(f => { newPerms[row.staffId][f.featureKey] = false; });
    });
    setLocalPerms(newPerms);
  };

  // Save
  const handleSave = async () => {
    if (!selectedDept) return;
    try {
      setSaving(true);
      setError(null);
      const rows = matrix.map(row => ({
        staffId: row.staffId,
        featureKeys: features
          .filter(f => localPerms[row.staffId]?.[f.featureKey])
          .map(f => f.featureKey),
      }));
      await accessApi.saveDeptMatrix(selectedDept, { rows });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  // Reset to original
  const handleReset = () => {
    const perms: Record<string, Record<string, boolean>> = {};
    matrix.forEach(row => {
      perms[row.staffId] = {};
      row.permissions.forEach(p => {
        perms[row.staffId][p.featureKey] = p.hasAccess;
      });
    });
    setLocalPerms(perms);
  };

  const grouped = groupByModule(features);
  const modules = Object.keys(grouped);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={18} className="text-indigo-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              {deptName || "Department"} — Permission Matrix
            </h1>
          </div>
          <p className="text-sm font-medium text-slate-400 ml-12">
            Manage feature access for each staff member in this department
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleReset} disabled={saving}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-50">
            <RotateCcw size={13} /> Reset
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Department Selector + Bulk Actions */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Dept dropdown */}
        <div className="relative">
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-4 pr-9 text-sm font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 min-w-[200px]"
          >
            <option value="">Select Department…</option>
            {departments.map(d => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={selectAll}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
            <CheckSquare size={13} /> Select All
          </button>
          <button onClick={clearAll}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors">
            <Square size={13} /> Clear All
          </button>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700">
          <Check size={15} /> Permissions saved successfully
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : matrix.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
          <Shield size={40} className="text-slate-200" strokeWidth={1.5} />
          <p className="text-sm font-bold text-slate-500">No staff found in this department</p>
          <p className="text-xs text-slate-400">Select a different department or add staff first</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-sm">
                {/* Module row */}
                <tr>
                  <th className="border-b border-slate-200 px-5 py-3 text-left" rowSpan={2}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Staff Member</span>
                  </th>
                  {modules.map(mod => (
                    <th
                      key={mod}
                      colSpan={grouped[mod].length}
                      className="border-b border-l border-slate-200 px-3 py-2 text-center"
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                    </th>
                  ))}
                  <th className="border-b border-l border-slate-200 px-4 py-3 text-center" rowSpan={2}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">All</span>
                  </th>
                </tr>
                {/* Feature row */}
                <tr>
                  {modules.map(mod =>
                    grouped[mod].map(f => (
                      <th key={f.featureKey}
                        className="border-b border-l border-slate-200 px-3 py-2 text-center"
                        title={f.featureName}
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          {shortLabel(f.featureKey)}
                        </span>
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              <tbody>
                {matrix.map((row, idx) => (
                  <tr key={row.staffId}
                    className={`group transition-colors hover:bg-indigo-50/30 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>

                    {/* Staff info */}
                    <td className="border-b border-slate-100 px-5 py-3 min-w-[200px]">
                      <p className="font-bold text-slate-800 text-sm">{row.fullName}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {row.jobTitle} · {row.loginId}
                      </p>
                    </td>

                    {/* Permission checkboxes */}
                    {modules.map(mod =>
                      grouped[mod].map(f => {
                        const checked = localPerms[row.staffId]?.[f.featureKey] ?? false;
                        return (
                          <td key={f.featureKey}
                            className="border-b border-l border-slate-100 px-3 py-3 text-center">
                            <button
                              onClick={() => toggleCell(row.staffId, f.featureKey)}
                              className={`h-5 w-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                                checked
                                  ? "bg-indigo-500 border-indigo-500 text-white"
                                  : "border-slate-300 bg-white hover:border-indigo-400"
                              }`}
                              title={`${checked ? "Revoke" : "Grant"} ${f.featureName}`}
                            >
                              {checked && <Check size={11} strokeWidth={3} />}
                            </button>
                          </td>
                        );
                      })
                    )}

                    {/* Row select-all */}
                    <td className="border-b border-l border-slate-100 px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => selectAllRow(row.staffId)}
                          className="rounded-lg p-1 text-emerald-500 hover:bg-emerald-50 transition-colors"
                          title="Grant all"
                        >
                          <CheckSquare size={14} />
                        </button>
                        <button
                          onClick={() => clearRow(row.staffId)}
                          className="rounded-lg p-1 text-red-400 hover:bg-red-50 transition-colors"
                          title="Revoke all"
                        >
                          <Square size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      {features.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Feature Legend</p>
          <div className="flex flex-wrap gap-2">
            {features.map(f => (
              <span key={f.featureKey}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                <span className="font-black text-indigo-500">{shortLabel(f.featureKey)}</span>
                {f.featureName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
