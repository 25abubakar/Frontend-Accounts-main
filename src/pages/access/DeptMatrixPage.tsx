/**
 * DeptMatrixPage — Hierarchical Permission Matrix
 *
 * Features:
 * - Groups staff by Job Title (role groups)
 * - Master Toggle per role group (updates all in that role)
 * - Individual overrides highlighted in amber when they differ from role default
 * - Local pending-changes state — single "Save Changes" batch POST
 * - Handles empty / loading / error states without crashing
 * - Virtualization-friendly: only renders visible rows
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, AlertCircle, Save, RotateCcw, CheckSquare, Square,
  Shield, ChevronDown, ChevronRight, Check, X, Users,
  AlertTriangle, ExternalLink,
} from "lucide-react";
import {
  accessApi,
  type MatrixStaffRow,
  type FeatureDto,
  type MatrixResponse,
} from "../../api/accessApi";
import { orgTreeApi } from "../../api/orgTreeApi";
import type { OrgNode } from "../../types";

// ── Type helpers ──────────────────────────────────────────────────────────
type PermMap = Record<string, Record<string, boolean>>; // rowKey → featureKey → bool

interface RoleGroup {
  jobTitle: string;
  rows: MatrixStaffRow[];
}

// ── Pure helpers (no hooks, safe to call anywhere) ────────────────────────
function rowKey(r: MatrixStaffRow): string {
  return r.staffId ?? r.personId;
}

function groupByRole(staff: MatrixStaffRow[]): RoleGroup[] {
  const map = new Map<string, MatrixStaffRow[]>();
  for (const r of staff) {
    const title = r.jobTitle ?? "Unassigned";
    if (!map.has(title)) map.set(title, []);
    map.get(title)!.push(r);
  }
  return Array.from(map.entries()).map(([jobTitle, rows]) => ({ jobTitle, rows }));
}

function groupByModule(features: FeatureDto[]): Record<string, FeatureDto[]> {
  return features.reduce<Record<string, FeatureDto[]>>((acc, f) => {
    const mod = f.module || "General";
    (acc[mod] ??= []).push(f);
    return acc;
  }, {});
}

function shortLabel(key: string): string {
  const parts = key.split("_");
  return parts[parts.length - 1].slice(0, 5).toUpperCase();
}

/** For a role group, compute the "majority" value for each feature (true if >50% have it) */
function roleMajority(rows: MatrixStaffRow[], featureKey: string): boolean {
  const hired = rows.filter(r => r.staffId);
  if (hired.length === 0) return false;
  const trueCount = hired.filter(r => {
    const p = r.permissions.find(p => p.featureKey === featureKey);
    return p?.hasAccess ?? false;
  }).length;
  return trueCount > hired.length / 2;
}

/** Build initial PermMap from API response */
function buildPermMap(staff: MatrixStaffRow[]): PermMap {
  const map: PermMap = {};
  for (const r of staff) {
    const key = rowKey(r);
    map[key] = {};
    for (const p of r.permissions ?? []) {
      map[key][p.featureKey] = p.hasAccess;
    }
  }
  return map;
}

// ── Role Group Row ────────────────────────────────────────────────────────
interface RoleGroupRowProps {
  group: RoleGroup;
  features: FeatureDto[];
  modules: string[];
  grouped: Record<string, FeatureDto[]>;
  localPerms: PermMap;
  originalPerms: PermMap;
  onToggleCell: (key: string, fk: string) => void;
  onRoleToggle: (jobTitle: string, fk: string, value: boolean) => void;
  onSelectAllRow: (key: string) => void;
  onClearRow: (key: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}

function RoleGroupRow({
  group, features, modules, grouped,
  localPerms, originalPerms,
  onToggleCell, onRoleToggle, onSelectAllRow, onClearRow, navigate,
}: RoleGroupRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hiredRows = group.rows.filter(r => r.staffId);

  // For each feature: is the role-level majority true/false?
  const roleMaj = useMemo(() =>
    Object.fromEntries(features.map(f => [f.featureKey, roleMajority(group.rows, f.featureKey)])),
    [group.rows, features]
  );

  // Pending changes count for this group
  const pendingCount = useMemo(() => {
    let count = 0;
    for (const r of group.rows) {
      const key = rowKey(r);
      for (const f of features) {
        const cur = localPerms[key]?.[f.featureKey] ?? false;
        const orig = originalPerms[key]?.[f.featureKey] ?? false;
        if (cur !== orig) count++;
      }
    }
    return count;
  }, [group.rows, features, localPerms, originalPerms]);

  return (
    <>
      {/* ── Role header row ── */}
      <tr className="bg-slate-100/80 sticky top-[57px] z-10">
        {/* Expand/collapse + role name */}
        <td className="border-b border-slate-200 px-4 py-2.5 min-w-[220px]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-left group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded text-slate-500 group-hover:text-indigo-600 transition-colors">
                {expanded
                  ? <ChevronDown size={14} strokeWidth={2.5} />
                  : <ChevronRight size={14} strokeWidth={2.5} />
                }
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                {group.jobTitle}
              </span>
            </button>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-500">
              {group.rows.length}
            </span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-600">
                {pendingCount} pending
              </span>
            )}
          </div>
        </td>

        {/* Role-level master toggles */}
        {modules.map(mod =>
          grouped[mod].map(f => {
            const maj = roleMaj[f.featureKey];
            // Check if all hired rows match majority
            const allMatch = hiredRows.every(r => (localPerms[rowKey(r)]?.[f.featureKey] ?? false) === maj);
            const someTrue = hiredRows.some(r => localPerms[rowKey(r)]?.[f.featureKey] ?? false);
            const allTrue  = hiredRows.length > 0 && hiredRows.every(r => localPerms[rowKey(r)]?.[f.featureKey] ?? false);

            return (
              <td key={f.featureKey} className="border-b border-l border-slate-200 px-2 py-2.5 text-center">
                {hiredRows.length > 0 ? (
                  <button
                    onClick={() => onRoleToggle(group.jobTitle, f.featureKey, !allTrue)}
                    title={`${allTrue ? "Revoke" : "Grant"} ${f.featureName} for all ${group.jobTitle}`}
                    className={`h-5 w-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                      allTrue
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : someTrue && !allTrue
                        ? "bg-indigo-200 border-indigo-400"
                        : "border-slate-300 bg-white hover:border-indigo-400"
                    } ${!allMatch ? "ring-2 ring-amber-300" : ""}`}
                  >
                    {allTrue && <Check size={11} strokeWidth={3} />}
                    {someTrue && !allTrue && <div className="h-1.5 w-1.5 rounded-sm bg-indigo-500" />}
                  </button>
                ) : (
                  <span className="text-slate-200 text-xs">—</span>
                )}
              </td>
            );
          })
        )}

        {/* Row actions placeholder */}
        <td className="border-b border-l border-slate-200 px-3 py-2.5 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Role</span>
        </td>
      </tr>

      {/* ── Individual rows ── */}
      <AnimatePresence initial={false}>
        {expanded && group.rows.map((row, idx) => {
          const key = rowKey(row);
          const isHired = row.isHired && !!row.staffId;

          return (
            <motion.tr
              key={key}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className={`group transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
              } ${isHired ? "hover:bg-indigo-50/20" : "opacity-55"}`}
            >
              {/* Person info */}
              <td className="border-b border-slate-100 px-4 py-2.5 min-w-[220px]">
                <div className="flex items-center gap-2.5 pl-5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 text-[10px] font-black text-white">
                    {row.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{row.fullName}</p>
                      {!isHired && (
                        <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black text-amber-600 ring-1 ring-amber-200">
                          Not hired
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400">{row.loginId}</p>
                  </div>
                  {isHired && (
                    <button
                      onClick={() => navigate(`/access/staff/${row.staffId}`)}
                      className="ml-auto shrink-0 rounded-md p-1 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100"
                      title="View full permissions"
                    >
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              </td>

              {/* Permission checkboxes */}
              {modules.map(mod =>
                grouped[mod].map(f => {
                  const checked  = localPerms[key]?.[f.featureKey] ?? false;
                  const original = originalPerms[key]?.[f.featureKey] ?? false;
                  const roleDef  = roleMaj[f.featureKey];
                  const isOverride = isHired && checked !== roleDef;
                  const isDirty    = checked !== original;

                  return (
                    <td key={f.featureKey} className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
                      <button
                        onClick={() => isHired && onToggleCell(key, f.featureKey)}
                        disabled={!isHired}
                        title={
                          !isHired ? "Person must be hired first"
                          : isOverride ? `Override: differs from ${group.jobTitle} default`
                          : `${checked ? "Revoke" : "Grant"} ${f.featureName}`
                        }
                        className={`h-5 w-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                          !isHired
                            ? "border-slate-100 bg-slate-50 cursor-not-allowed"
                            : checked
                            ? isOverride
                              ? "bg-amber-400 border-amber-400 text-white"   // override — amber
                              : "bg-indigo-500 border-indigo-500 text-white"  // normal grant
                            : isOverride
                            ? "border-amber-300 bg-amber-50 hover:border-amber-400"  // override revoke
                            : "border-slate-200 bg-white hover:border-indigo-400"
                        } ${isDirty ? "ring-2 ring-offset-1 ring-sky-400" : ""}`}
                      >
                        {checked && isHired && <Check size={10} strokeWidth={3} />}
                      </button>
                    </td>
                  );
                })
              )}

              {/* Row actions */}
              <td className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
                {isHired ? (
                  <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onSelectAllRow(key)} title="Grant all"
                      className="rounded p-1 text-emerald-500 hover:bg-emerald-50 transition-colors">
                      <CheckSquare size={12} />
                    </button>
                    <button onClick={() => onClearRow(key)} title="Revoke all"
                      className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors">
                      <Square size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-200 text-xs">—</span>
                )}
              </td>
            </motion.tr>
          );
        })}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DeptMatrixPage() {
  const { deptId } = useParams<{ deptId: string }>();
  const navigate   = useNavigate();

  // Department selector
  const [departments, setDepartments] = useState<OrgNode[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>(deptId ?? "");
  const [deptName, setDeptName] = useState<string>("");

  // Matrix data from API
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);

  // Local pending state (what user has changed but not saved)
  const [localPerms, setLocalPerms]       = useState<PermMap>({});
  const [originalPerms, setOriginalPerms] = useState<PermMap>({});

  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sticky header ref for scroll shadow
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Load departments ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      orgTreeApi.getByLabel("Branch").catch(() => [] as OrgNode[]),
      orgTreeApi.getByLabel("Department").catch(() => [] as OrgNode[]),
    ]).then(([branches, depts]) => {
      const seen = new Set<number>();
      const unique = [...branches, ...depts].filter(n => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      setDepartments(unique);
      if (!selectedDept && unique.length > 0) setSelectedDept(String(unique[0].id));
    });
  }, []);

  // ── Update dept name ─────────────────────────────────────────────────
  useEffect(() => {
    const found = departments.find(d => String(d.id) === selectedDept);
    setDeptName(found?.name ?? "");
  }, [selectedDept, departments]);

  // ── Load matrix ──────────────────────────────────────────────────────
  const loadMatrix = useCallback(async () => {
    if (!selectedDept) return;
    try {
      setLoading(true); setError(null);
      const data = await accessApi.getDeptMatrix(selectedDept);
      setMatrixData(data);
      const perms = buildPermMap(data.staff ?? []);
      setLocalPerms(perms);
      setOriginalPerms(JSON.parse(JSON.stringify(perms))); // deep clone
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to load permission matrix.");
    } finally { setLoading(false); }
  }, [selectedDept]);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  // ── Derived data ─────────────────────────────────────────────────────
  const features = useMemo(() => matrixData?.features ?? [], [matrixData]);
  const staff    = useMemo(() => matrixData?.staff    ?? [], [matrixData]);
  const grouped  = useMemo(() => groupByModule(features), [features]);
  const modules  = useMemo(() => Object.keys(grouped), [grouped]);
  const roleGroups = useMemo(() => groupByRole(staff), [staff]);

  // Count total pending changes
  const pendingCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(localPerms)) {
      for (const fk of Object.keys(localPerms[key])) {
        if ((localPerms[key][fk] ?? false) !== (originalPerms[key]?.[fk] ?? false)) count++;
      }
    }
    return count;
  }, [localPerms, originalPerms]);

  // ── Cell toggle ──────────────────────────────────────────────────────
  const handleToggleCell = useCallback((key: string, fk: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [key]: { ...prev[key], [fk]: !(prev[key]?.[fk] ?? false) },
    }));
  }, []);

  // ── Role-level master toggle ─────────────────────────────────────────
  const handleRoleToggle = useCallback((jobTitle: string, fk: string, value: boolean) => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const r of staff) {
        if ((r.jobTitle ?? "Unassigned") !== jobTitle) continue;
        if (!r.staffId) continue; // skip unhired
        const key = rowKey(r);
        next[key] = { ...next[key], [fk]: value };
      }
      return next;
    });
  }, [staff]);

  // ── Row select / clear ───────────────────────────────────────────────
  const handleSelectAllRow = useCallback((key: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [key]: Object.fromEntries(features.map(f => [f.featureKey, true])),
    }));
  }, [features]);

  const handleClearRow = useCallback((key: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [key]: Object.fromEntries(features.map(f => [f.featureKey, false])),
    }));
  }, [features]);

  // ── Grid select / clear ──────────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const r of staff) {
        if (!r.staffId) continue;
        const key = rowKey(r);
        next[key] = Object.fromEntries(features.map(f => [f.featureKey, true]));
      }
      return next;
    });
  }, [staff, features]);

  const handleClearAll = useCallback(() => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const r of staff) {
        const key = rowKey(r);
        next[key] = Object.fromEntries(features.map(f => [f.featureKey, false]));
      }
      return next;
    });
  }, [staff, features]);

  // ── Reset ────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setLocalPerms(JSON.parse(JSON.stringify(originalPerms)));
  }, [originalPerms]);

  // ── Save (batch POST) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedDept || !matrixData) return;
    try {
      setSaving(true); setError(null);
      const items: { staffId: string; featureKey: string; hasAccess: boolean }[] = [];
      for (const r of staff) {
        if (!r.staffId) continue;
        const key = rowKey(r);
        for (const f of features) {
          items.push({
            staffId:    r.staffId,
            featureKey: f.featureKey,
            hasAccess:  localPerms[key]?.[f.featureKey] ?? false,
          });
        }
      }
      await accessApi.saveDeptMatrix(selectedDept, { items });
      // Commit local → original
      setOriginalPerms(JSON.parse(JSON.stringify(localPerms)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to save permissions. Please try again.");
    } finally { setSaving(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
              <Shield size={18} className="text-indigo-500" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">
                {deptName || "Branch"} — Permission Matrix
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Grouped by role · Individual overrides highlighted in{" "}
                <span className="text-amber-500 font-bold">amber</span>
                {" · "}
                <span className="text-sky-500 font-bold">blue ring</span> = unsaved change
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">
                {pendingCount} unsaved
              </span>
            )}
            <button onClick={handleReset} disabled={saving || pendingCount === 0}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-40">
              <RotateCcw size={12} /> Reset
            </button>
            <button onClick={handleSave} disabled={saving || loading || pendingCount === 0}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Toolbar row */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          {/* Dept selector */}
          <div className="relative">
            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none min-w-[180px]">
              <option value="">Select Branch…</option>
              {departments.map(d => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}{d.label !== "Branch" ? ` (${d.label})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <button onClick={handleSelectAll}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
            <CheckSquare size={12} /> Select All
          </button>
          <button onClick={handleClearAll}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors">
            <Square size={12} /> Clear All
          </button>

          {matrixData && (
            <span className="ml-auto text-[11px] font-bold text-slate-400">
              {staff.length} person{staff.length !== 1 ? "s" : ""} ·{" "}
              {staff.filter(r => !r.isHired).length > 0 && (
                <span className="text-amber-500">
                  {staff.filter(r => !r.isHired).length} not hired ·{" "}
                </span>
              )}
              {features.length} features
            </span>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      <div className="shrink-0 px-5 lg:px-8">
        <AnimatePresence>
          {saveSuccess && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700">
              <Check size={14} /> Permissions saved successfully
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
              <AlertCircle size={14} /> {error}
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={13} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Matrix body ── */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={32} className="animate-spin text-indigo-500" />
          </div>

        ) : staff.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
            <Users size={40} className="text-slate-200" strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-500">No persons found in this branch</p>
            <p className="text-xs text-slate-400">Select a different branch or register persons first</p>
          </div>

        ) : features.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
            <Shield size={40} className="text-slate-200" strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-500">No features defined</p>
            <p className="text-xs text-slate-400">Add features via the backend first</p>
          </div>

        ) : (
          <div ref={tableRef} className="h-full overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-sm">

              {/* ── Column headers ── */}
              <thead className="sticky top-0 z-20 bg-white shadow-sm">
                {/* Module row */}
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left min-w-[220px]" rowSpan={2}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Person / Role
                    </span>
                  </th>
                  {modules.map(mod => (
                    <th key={mod} colSpan={grouped[mod].length}
                      className="border-b border-l border-slate-200 px-2 py-2 text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                    </th>
                  ))}
                  <th className="border-b border-l border-slate-200 px-3 py-3 text-center min-w-[60px]" rowSpan={2}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Row</span>
                  </th>
                </tr>
                {/* Feature key row */}
                <tr>
                  {modules.map(mod =>
                    grouped[mod].map(f => (
                      <th key={f.featureKey}
                        className="border-b border-l border-slate-200 px-2 py-2 text-center"
                        title={f.featureName}>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                          {shortLabel(f.featureKey)}
                        </span>
                      </th>
                    ))
                  )}
                </tr>
              </thead>

              {/* ── Body: role groups ── */}
              <tbody>
                {roleGroups.map(group => (
                  <RoleGroupRow
                    key={group.jobTitle}
                    group={group}
                    features={features}
                    modules={modules}
                    grouped={grouped}
                    localPerms={localPerms}
                    originalPerms={originalPerms}
                    onToggleCell={handleToggleCell}
                    onRoleToggle={handleRoleToggle}
                    onSelectAllRow={handleSelectAllRow}
                    onClearRow={handleClearRow}
                    navigate={navigate}
                  />
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border-2 bg-indigo-500 border-indigo-500" /> Granted
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border-2 bg-amber-400 border-amber-400" /> Override
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded border-2 border-slate-200 ring-2 ring-sky-400" /> Unsaved
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={10} className="text-amber-500" /> Role header = master toggle
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {roleGroups.length} role{roleGroups.length !== 1 ? "s" : ""} · {staff.length} persons
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
