/**
 * AccessControlPage
 * Two-tab layout:
 *   Tab 1 — Access Groups  (job-title / role based)
 *   Tab 2 — Dept Permissions (branch/department matrix — TRI-STATE)
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers, Shield, Plus, Search, Edit2, Trash2, X, Loader2,
  AlertCircle, Users, CheckSquare, Check, Save, ChevronDown,
  AlertTriangle, UserPlus, UserMinus, ExternalLink, Zap,
  RotateCcw, Square, Building2,
} from "lucide-react";
import {
  accessApi,
  type AccessGroupDto,
  type FeatureDto,
  type CreateGroupDto,
  type MatrixResponse,
  type MatrixStaffRow,
  type PermissionState,
} from "../../api/accessApi";
import { staffApi } from "../../api/staffApi";
import { orgTreeApi } from "../../api/orgTreeApi";
import type { StaffDto, OrgNode } from "../../types";
import TriStateCheckbox, { booleanToState } from "../../components/shared/TriStateCheckbox";

// ── Tri-state PermMap ─────────────────────────────────────────────────────
// rowKey → featureKey → PermissionState ("ALLOW" | "DENY" | "INHERIT")
type TriPermMap = Record<string, Record<string, PermissionState>>;

// ── Shared helpers ────────────────────────────────────────────────────────
function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items", "staff"]) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

function groupByModule(features: FeatureDto[]): Record<string, FeatureDto[]> {
  return toArr<FeatureDto>(features).reduce<Record<string, FeatureDto[]>>((acc, f) => {
    const m = f.module || "General";
    (acc[m] ??= []).push(f);
    return acc;
  }, {});
}

function shortLabel(key: string) {
  const p = key.split("_");
  return p[p.length - 1].slice(0, 5).toUpperCase();
}

function rowKey(r: MatrixStaffRow) { return r.staffId ?? r.personId; }

// Legacy boolean PermMap (kept for compat) - currently unused
// type PermMap = Record<string, Record<string, boolean>>;

function buildTriPermMap(staff: MatrixStaffRow[]): TriPermMap {
  const m: TriPermMap = {};
  for (const r of toArr<MatrixStaffRow>(staff)) {
    const k = rowKey(r);
    m[k] = {};
    for (const p of toArr(r.permissions)) {
      const pp = p as { featureKey: string; hasAccess: boolean; state?: PermissionState };
      // Use explicit state if provided, else derive from hasAccess
      m[k][pp.featureKey] = pp.state ?? booleanToState(pp.hasAccess);
    }
  }
  return m;
}

// Role badge colours
const ROLE_COLORS: Record<string, string> = {
  agent:        "bg-gray-100 text-gray-700",
  supervisor:   "bg-blue-100 text-blue-700",
  manager:      "bg-green-100 text-green-700",
  asstmanager:  "bg-yellow-100 text-yellow-700",
  ceo:          "bg-purple-100 text-purple-700",
  dutyceo:      "bg-indigo-100 text-indigo-700",
  "bell boy":   "bg-orange-100 text-orange-700",
  bellboy:      "bg-orange-100 text-orange-700",
};
function roleBadge(name: string) {
  const key = name.toLowerCase().replace(/\s+/g, "");
  return ROLE_COLORS[key] ?? ROLE_COLORS[name.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

// Avatar letter colour
const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block";

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — ACCESS GROUPS
// ═══════════════════════════════════════════════════════════════════════════

// ── Group Create/Edit Modal — with tri-state feature toggles ─────────────
function GroupModal({
  mode, group, allFeatures, onClose, onSaved,
}: {
  mode: "create" | "edit";
  group?: AccessGroupDto;
  allFeatures: FeatureDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName]   = useState(group?.groupName ?? "");
  const [desc, setDesc]   = useState(group?.description ?? "");
  // Tri-state per feature: ALLOW = in group, DENY = explicitly blocked, INHERIT = not set
  const [featureStates, setFeatureStates] = useState<Record<string, PermissionState>>(() => {
    const init: Record<string, PermissionState> = {};
    toArr<string>(group?.features).forEach(k => { init[k] = "ALLOW"; });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const safe    = toArr<FeatureDto>(allFeatures);
  const grouped = groupByModule(safe);
  const modules = Object.keys(grouped);

  const setFeatureState = (key: string, state: PermissionState) => {
    setFeatureStates(p => ({ ...p, [key]: state }));
  };

  const toggleModule = (mod: string, targetState: PermissionState) => {
    const keys = (grouped[mod] ?? []).map(f => f.featureKey);
    setFeatureStates(p => {
      const n = { ...p };
      keys.forEach(k => { n[k] = targetState; });
      return n;
    });
  };

  // Count by state
  const allowCount   = Object.values(featureStates).filter(s => s === "ALLOW").length;
  const denyCount    = Object.values(featureStates).filter(s => s === "DENY").length;

  const save = async () => {
    if (!name.trim()) { setError("Group name is required."); return; }
    try {
      setSaving(true); setError(null);
      // Only ALLOW features go into featureKeys
      const featureKeys = Object.entries(featureStates)
        .filter(([, s]) => s === "ALLOW")
        .map(([k]) => k);
      const payload: CreateGroupDto = {
        groupName: name.trim(),
        description: desc.trim() || undefined,
        featureKeys,
      };
      if (mode === "create") await accessApi.createGroup(payload);
      else if (group) {
        await accessApi.updateGroup(group.groupId, payload);
        await accessApi.updateGroupFeatures(group.groupId, { featureKeys });
      }
      onSaved(); onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to save.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={18} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                {mode === "create" ? "Create Access Group" : `Edit — ${group?.groupName}`}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-indigo-500">{allowCount} ALLOW</span>
                {denyCount > 0 && <span className="text-[10px] font-bold text-red-500">{denyCount} DENY</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

          {/* Legend */}
          <div className="flex items-center gap-4 rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to cycle:</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
              <div className="h-4 w-4 rounded border-2 border-slate-300 bg-white" /> Inherit
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
              <div className="h-4 w-4 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center">
                <Check size={9} strokeWidth={3} className="text-white" />
              </div> Allow
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600">
              <div className="h-4 w-4 rounded border-2 bg-red-500 border-red-500 flex items-center justify-center">
                <X size={9} strokeWidth={3} className="text-white" />
              </div> Deny
            </span>
          </div>

          <div>
            <label className={LABEL}>Group Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className={INPUT} placeholder="e.g. Agent, Manager, Software Team" />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className={`${INPUT} resize-none`} placeholder="What access does this group provide?" />
          </div>

          <div>
            <label className={LABEL}>Features ({allowCount} allowed · {denyCount} denied)</label>
            <div className="space-y-2">
              {modules.map(mod => {
                const mf = grouped[mod] ?? [];
                const modAllowed = mf.filter(f => featureStates[f.featureKey] === "ALLOW").length;
                const modDenied  = mf.filter(f => featureStates[f.featureKey] === "DENY").length;
                const allAllow   = mf.every(f => featureStates[f.featureKey] === "ALLOW");

                return (
                  <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                    {/* Module header with bulk actions */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">{mod}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {modAllowed > 0 && <span className="text-indigo-500">{modAllowed}✓ </span>}
                          {modDenied > 0  && <span className="text-red-500">{modDenied}✗ </span>}
                          / {mf.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggleModule(mod, "ALLOW")}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                          All Allow
                        </button>
                        <button onClick={() => toggleModule(mod, "DENY")}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                          All Deny
                        </button>
                        <button onClick={() => toggleModule(mod, "INHERIT")}
                          className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Feature items */}
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2">
                      {mf.map(f => {
                        const state = featureStates[f.featureKey] ?? "INHERIT";
                        return (
                          <div key={f.featureKey}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all ${
                              state === "ALLOW" ? "bg-indigo-50 ring-1 ring-indigo-200"
                              : state === "DENY" ? "bg-red-50 ring-1 ring-red-200"
                              : "bg-white hover:bg-slate-50"
                            }`}>
                            <TriStateCheckbox
                              state={state}
                              onChange={s => setFeatureState(f.featureKey, s)}
                              size={18}
                            />
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">{f.featureKey}</p>
                              <p className="text-xs font-semibold text-slate-700 truncate">{f.featureName}</p>
                            </div>
                            {state !== "INHERIT" && (
                              <span className={`ml-auto shrink-0 text-[9px] font-black ${state === "ALLOW" ? "text-indigo-500" : "text-red-500"}`}>
                                {state}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mode === "create" ? "Create Group" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Group Detail Side Panel ───────────────────────────────────────────────
function GroupPanel({
  group, allFeatures, allStaff, onClose, onRefresh,
}: {
  group: AccessGroupDto;
  allFeatures: FeatureDto[];
  allStaff: StaffDto[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const [assigned, setAssigned]     = useState<StaffDto[]>([]);
  const [loadingS, setLoadingS]     = useState(true);
  const [search, setSearch]         = useState("");
  const [assigning, setAssigning]   = useState<string | null>(null);
  const [removing, setRemoving]     = useState<string | null>(null);

  const safeFeats = toArr<string>(group.features);
  const grouped   = groupByModule(toArr<FeatureDto>(allFeatures).filter(f => safeFeats.includes(f.featureKey)));
  const modules   = Object.keys(grouped);

  const loadStaff = useCallback(async () => {
    try {
      setLoadingS(true);
      const all = await staffApi.getAll();
      const inGroup: StaffDto[] = [];
      await Promise.all(all.map(async s => {
        try {
          const gs = await accessApi.getStaffGroups(s.staffId);
          if (toArr(gs).some((g: unknown) => (g as { groupId: number }).groupId === group.groupId)) inGroup.push(s);
        } catch { /* skip */ }
      }));
      setAssigned(inGroup);
    } catch { /* silent */ } finally { setLoadingS(false); }
  }, [group.groupId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const assignedIds = new Set(assigned.map(s => s.staffId));
  const available   = allStaff.filter(s => {
    if (assignedIds.has(s.staffId)) return false;
    const q = search.toLowerCase();
    return !q || s.fullName.toLowerCase().includes(q) || (s.loginId ?? "").toLowerCase().includes(q) || s.jobTitle.toLowerCase().includes(q);
  });

  const assign = async (id: string) => {
    try { setAssigning(id); await accessApi.addStaffToGroup(id, group.groupId); await loadStaff(); onRefresh(); }
    catch { /* silent */ } finally { setAssigning(null); }
  };
  const remove = async (id: string) => {
    try { setRemoving(id); await accessApi.removeStaffFromGroup(id, group.groupId); await loadStaff(); onRefresh(); }
    catch { /* silent */ } finally { setRemoving(null); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white bg-gradient-to-br ${avatarGrad(group.groupName)}`}>
              {group.groupName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">{group.groupName}</h2>
              {group.description && <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 p-5 pb-0">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-center">
              <p className="text-2xl font-black text-indigo-600">{safeFeats.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-0.5">Features</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
              <p className="text-2xl font-black text-sky-600">{assigned.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mt-0.5">Staff</p>
            </div>
          </div>

          {/* Assigned staff */}
          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Assigned Staff ({assigned.length})</p>
            {loadingS ? (
              <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
            ) : assigned.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <Users size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">No staff assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assigned.map(s => (
                  <div key={s.staffId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(s.fullName)} text-xs font-black text-white`}>
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.fullName}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{s.loginId} · {s.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => navigate(`/access/staff/${s.staffId}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-indigo-500 transition-colors" title="View permissions">
                        <ExternalLink size={13} />
                      </button>
                      <button onClick={() => remove(s.staffId)} disabled={removing === s.staffId}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50">
                        {removing === s.staffId ? <Loader2 size={13} className="animate-spin" /> : <UserMinus size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add staff */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Add Staff to Group</p>
            <div className="relative mb-2">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, job title…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none" />
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {available.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">{search ? "No staff match" : "All staff assigned"}</p>
              ) : available.slice(0, 25).map(s => (
                <div key={s.staffId} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(s.fullName)} text-[10px] font-black text-white`}>
                    {s.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{s.fullName}</p>
                    <p className="text-[10px] text-slate-400">{s.loginId} · {s.jobTitle}</p>
                  </div>
                  <button onClick={() => assign(s.staffId)} disabled={assigning === s.staffId}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                    {assigning === s.staffId ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />} Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Features ({safeFeats.length})</p>
            {modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <CheckSquare size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">No features assigned — click Edit to add</p>
              </div>
            ) : modules.map(mod => (
              <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden mb-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                </div>
                <div className="p-3 space-y-1">
                  {(grouped[mod] ?? []).map(f => (
                    <div key={f.featureKey} className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3 py-1.5">
                      <div className="h-3.5 w-3.5 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center shrink-0">
                        <Check size={9} strokeWidth={3} className="text-white" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 flex-1">{f.featureName}</p>
                      <span className="text-[9px] font-mono text-slate-400">{f.featureKey}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — DEPT PERMISSIONS (hierarchical matrix)
// ═══════════════════════════════════════════════════════════════════════════

function DeptTab() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<OrgNode[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [deptName, setDeptName] = useState("");
  const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
  const [localPerms, setLocalPerms]       = useState<TriPermMap>({});
  const [originalPerms, setOriginalPerms] = useState<TriPermMap>({});
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  // Load branches
  useEffect(() => {
    Promise.all([
      orgTreeApi.getByLabel("Branch").catch(() => [] as OrgNode[]),
      orgTreeApi.getByLabel("Department").catch(() => [] as OrgNode[]),
    ]).then(([b, d]) => {
      const seen = new Set<number>();
      const u = [...b, ...d].filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
      setDepartments(u);
      if (u.length > 0) setSelectedDept(String(u[0].id));
    });
  }, []);

  useEffect(() => {
    const f = departments.find(d => String(d.id) === selectedDept);
    setDeptName(f?.name ?? "");
  }, [selectedDept, departments]);

  const loadMatrix = useCallback(async () => {
    if (!selectedDept) return;
    try {
      setLoading(true); setError(null);
      const data = await accessApi.getDeptMatrix(selectedDept);
      setMatrixData(data);
      const p = buildTriPermMap(data.staff ?? []);
      setLocalPerms(p);
      setOriginalPerms(JSON.parse(JSON.stringify(p)));
    } catch { setError("Failed to load matrix."); }
    finally { setLoading(false); }
  }, [selectedDept]);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  const features = toArr<FeatureDto>(matrixData?.features);
  const staff    = toArr<MatrixStaffRow>(matrixData?.staff);
  const grouped  = groupByModule(features);
  const modules  = Object.keys(grouped);

  // Group staff by job title
  const roleGroups = (() => {
    const map = new Map<string, MatrixStaffRow[]>();
    for (const r of staff) {
      const t = r.jobTitle ?? "Unassigned";
      (map.get(t) ?? (map.set(t, []), map.get(t)!)).push(r);
    }
    return Array.from(map.entries()).map(([title, rows]) => ({ title, rows }));
  })();

  const pendingCount = (() => {
    let c = 0;
    for (const k of Object.keys(localPerms))
      for (const fk of Object.keys(localPerms[k]))
        if ((localPerms[k][fk] ?? "INHERIT") !== (originalPerms[k]?.[fk] ?? "INHERIT")) c++;
    return c;
  })();

  // Tri-state cell toggle
  const toggleCell = (key: string, fk: string, state: PermissionState) =>
    setLocalPerms(p => ({ ...p, [key]: { ...p[key], [fk]: state } }));

  // Role-level master toggle — cycles all in role
  const roleToggle = (title: string, fk: string, state: PermissionState) =>
    setLocalPerms(p => {
      const n = { ...p };
      for (const r of staff) {
        if ((r.jobTitle ?? "Unassigned") !== title || !r.staffId) continue;
        const k = rowKey(r);
        n[k] = { ...n[k], [fk]: state };
      }
      return n;
    });

  const selectAllRow = (key: string) =>
    setLocalPerms(p => ({ ...p, [key]: Object.fromEntries(features.map(f => [f.featureKey, "ALLOW" as PermissionState])) }));

  const denyAllRow = (key: string) =>
    setLocalPerms(p => ({ ...p, [key]: Object.fromEntries(features.map(f => [f.featureKey, "DENY" as PermissionState])) }));

  const clearRow = (key: string) =>
    setLocalPerms(p => ({ ...p, [key]: Object.fromEntries(features.map(f => [f.featureKey, "INHERIT" as PermissionState])) }));

  const handleSave = async () => {
    if (!selectedDept || !matrixData) return;
    try {
      setSaving(true); setError(null);
      const items = staff.filter(r => r.staffId).flatMap(r =>
        features.map(f => {
          const state = localPerms[rowKey(r)]?.[f.featureKey] ?? "INHERIT";
          return {
            staffId:    r.staffId!,
            featureKey: f.featureKey,
            hasAccess:  state === "ALLOW",
            state,
          };
        })
      );
      await accessApi.saveDeptMatrix(selectedDept, { items });
      setOriginalPerms(JSON.parse(JSON.stringify(localPerms)));
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
    } catch { setError("Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 flex flex-wrap gap-3 items-center mb-4">
        <div className="relative">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none min-w-[200px]">
            <option value="">Select Branch…</option>
            {departments.map((d, index) => (
              <option key={d.id} value={String(d.id)}>{`${index + 1}. ${d.name}`}</option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
        {/* Bulk ALLOW */}
        <button onClick={() => {
          setLocalPerms(p => {
            const n = { ...p };
            for (const r of staff) { if (!r.staffId) continue; n[rowKey(r)] = Object.fromEntries(features.map(f => [f.featureKey, "ALLOW" as PermissionState])); }
            return n;
          });
        }} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
          <CheckSquare size={12} /> Allow All
        </button>
        {/* Bulk DENY */}
        <button onClick={() => {
          setLocalPerms(p => {
            const n = { ...p };
            for (const r of staff) { n[rowKey(r)] = Object.fromEntries(features.map(f => [f.featureKey, "DENY" as PermissionState])); }
            return n;
          });
        }} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
          <X size={12} /> Deny All
        </button>
        {/* Clear to INHERIT */}
        <button onClick={() => {
          setLocalPerms(p => {
            const n = { ...p };
            for (const r of staff) { n[rowKey(r)] = Object.fromEntries(features.map(f => [f.featureKey, "INHERIT" as PermissionState])); }
            return n;
          });
        }} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
          <Square size={12} /> Clear All
        </button>
        <button onClick={() => setLocalPerms(JSON.parse(JSON.stringify(originalPerms)))} disabled={pendingCount === 0}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
          <RotateCcw size={12} /> Reset
        </button>
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 && <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">{pendingCount} unsaved</span>}
          <button onClick={handleSave} disabled={saving || pendingCount === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save Changes
          </button>
        </div>
      </div>

      {/* Banners */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700 shrink-0">
            <Check size={14} /> Permissions saved
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600 shrink-0">
            <AlertCircle size={14} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
        ) : staff.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <Users size={40} className="text-slate-200" strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-500">No persons in this branch</p>
          </div>
        ) : (
          <div className="h-full overflow-auto custom-scrollbar">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-20 bg-white shadow-sm">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left min-w-[220px]" rowSpan={2}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Person / Role</span>
                  </th>
                  {modules.map(mod => (
                    <th key={mod} colSpan={(grouped[mod] ?? []).length} className="border-b border-l border-slate-200 px-2 py-2 text-center">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                    </th>
                  ))}
                  <th className="border-b border-l border-slate-200 px-3 py-3 text-center min-w-[72px]" rowSpan={2}>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Row</span>
                  </th>
                </tr>
                <tr>
                  {modules.map(mod => (grouped[mod] ?? []).map(f => (
                    <th key={f.featureKey} className="border-b border-l border-slate-200 px-2 py-2 text-center" title={f.featureName}>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{shortLabel(f.featureKey)}</span>
                    </th>
                  )))}
                </tr>
              </thead>
              <tbody>
                {roleGroups.map(({ title, rows }) => (
                  <TriRoleSection key={title} title={title} rows={rows}
                    features={features} modules={modules} grouped={grouped}
                    localPerms={localPerms} originalPerms={originalPerms}
                    onToggle={toggleCell} onRoleToggle={roleToggle}
                    onSelectAll={selectAllRow} onDenyAll={denyAllRow} onClearRow={clearRow}
                    navigate={navigate} />
                ))}
              </tbody>
            </table>
            {/* Legend */}
            <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-5 py-2 flex items-center gap-4 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border-2 border-slate-300 bg-white" /> Inherit
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border-2 bg-indigo-500 border-indigo-500" /> Allow
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border-2 bg-red-500 border-red-500" /> Deny
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border-2 border-slate-200 ring-2 ring-sky-400" /> Unsaved
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded border-2 border-amber-300 ring-2 ring-amber-300" /> Override
              </span>
              <span className="ml-auto">{staff.length} persons · {features.length} features</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tri-state Role Section ────────────────────────────────────────────────
function TriRoleSection({ title, rows, features, modules, grouped, localPerms, originalPerms, onToggle, onRoleToggle, onSelectAll, onDenyAll, onClearRow, navigate }: {
  title: string;
  rows: MatrixStaffRow[];
  features: FeatureDto[];
  modules: string[];
  grouped: Record<string, FeatureDto[]>;
  localPerms: TriPermMap;
  originalPerms: TriPermMap;
  onToggle: (k: string, fk: string, state: PermissionState) => void;
  onRoleToggle: (t: string, fk: string, state: PermissionState) => void;
  onSelectAll: (k: string) => void;
  onDenyAll: (k: string) => void;
  onClearRow: (k: string) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const [open, setOpen] = useState(true);
  const hiredRows = rows.filter(r => r.staffId);

  const pending = rows.reduce((c, r) => {
    const k = rowKey(r);
    return c + features.filter(f =>
      (localPerms[k]?.[f.featureKey] ?? "INHERIT") !== (originalPerms[k]?.[f.featureKey] ?? "INHERIT")
    ).length;
  }, 0);

  // Role majority state per feature
  const roleMaj = (fk: string): PermissionState => {
    if (hiredRows.length === 0) return "INHERIT";
    const counts = { ALLOW: 0, DENY: 0, INHERIT: 0 };
    hiredRows.forEach(r => {
      const s = localPerms[rowKey(r)]?.[fk] ?? "INHERIT";
      counts[s]++;
    });
    if (counts.ALLOW >= hiredRows.length) return "ALLOW";
    if (counts.DENY  >= hiredRows.length) return "DENY";
    return "INHERIT";
  };

  return (
    <>
      {/* Role header */}
      <tr className="bg-slate-100/80 sticky top-[57px] z-10">
        <td className="border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(v => !v)} className="flex items-center gap-1.5 group">
              <div className="flex h-5 w-5 items-center justify-center rounded text-slate-500 group-hover:text-indigo-600">
                <ChevronDown size={14} strokeWidth={2.5} className={open ? "" : "-rotate-90"} />
              </div>
              <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${roleBadge(title)}`}>{title}</span>
            </button>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-500">{rows.length}</span>
            {pending > 0 && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-black text-sky-600">{pending} pending</span>}
          </div>
        </td>
        {/* Role master toggles — tri-state */}
        {modules.map(mod => (grouped[mod] ?? []).map(f => {
          const maj = roleMaj(f.featureKey);
          return (
            <td key={f.featureKey} className="border-b border-l border-slate-200 px-2 py-2.5 text-center">
              {hiredRows.length > 0 ? (
                <TriStateCheckbox
                  state={maj}
                  onChange={s => onRoleToggle(title, f.featureKey, s)}
                  size={18}
                  title={`Set ${f.featureName} for all ${title}`}
                />
              ) : <span className="text-slate-200 text-xs">—</span>}
            </td>
          );
        }))}
        <td className="border-b border-l border-slate-200 px-3 py-2.5 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Role</span>
        </td>
      </tr>

      {/* Individual rows */}
      {open && rows.map((row, idx) => {
        const key = rowKey(row);
        const isHired = row.isHired && !!row.staffId;

        return (
          <tr key={key} className={`group transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"} ${isHired ? "hover:bg-indigo-50/20" : "opacity-55"}`}>
            <td className="border-b border-slate-100 px-4 py-2.5 min-w-[220px]">
              <div className="flex items-center gap-2.5 pl-5">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(row.fullName)} text-[10px] font-black text-white`}>
                  {row.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{row.fullName}</p>
                    {!isHired && <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-black text-amber-600 ring-1 ring-amber-200">Not hired</span>}
                  </div>
                  <p className="text-[10px] font-mono text-slate-400">{row.loginId}</p>
                </div>
                {isHired && (
                  <button onClick={() => navigate(`/access/staff/${row.staffId}`)}
                    className="ml-auto shrink-0 rounded-md p-1 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100">
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
            </td>

            {/* Tri-state checkboxes */}
            {modules.map(mod => (grouped[mod] ?? []).map(f => {
              const state    = localPerms[key]?.[f.featureKey] ?? "INHERIT";
              const original = originalPerms[key]?.[f.featureKey] ?? "INHERIT";
              const isDirty  = state !== original;
              const isOverride = isHired && state !== roleMaj(f.featureKey) && state !== "INHERIT";

              return (
                <td key={f.featureKey} className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
                  <TriStateCheckbox
                    state={state}
                    onChange={s => isHired && onToggle(key, f.featureKey, s)}
                    disabled={!isHired}
                    size={18}
                    isDirty={isDirty}
                    isOverride={isOverride}
                    title={!isHired ? "Must be hired first" : undefined}
                  />
                </td>
              );
            }))}

            {/* Row actions */}
            <td className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
              {isHired ? (
                <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onSelectAll(key)} title="Allow all"
                    className="rounded p-1 text-indigo-500 hover:bg-indigo-50 transition-colors">
                    <CheckSquare size={11} />
                  </button>
                  <button onClick={() => onDenyAll(key)} title="Deny all"
                    className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors">
                    <X size={11} />
                  </button>
                  <button onClick={() => onClearRow(key)} title="Clear (inherit)"
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 transition-colors">
                    <Square size={11} />
                  </button>
                </div>
              ) : <span className="text-slate-200 text-xs">—</span>}
            </td>
          </tr>
        );
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — two tabs
// ═══════════════════════════════════════════════════════════════════════════
export default function AccessControlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") ?? "groups") as "groups" | "dept";
  const setTab = (t: "groups" | "dept") => setSearchParams({ tab: t });

  // ── Groups tab state ────────────────────────────────────────────────
  const [groups, setGroups]         = useState<AccessGroupDto[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDto[]>([]);
  const [allStaff, setAllStaff]     = useState<StaffDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [query, setQuery]           = useState("");
  const [seeding, setSeeding]       = useState(false);
  const [seedMsg, setSeedMsg]       = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccessGroupDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessGroupDto | null>(null);
  const [viewTarget, setViewTarget] = useState<AccessGroupDto | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [g, f, s] = await Promise.all([accessApi.getGroups(), accessApi.getAllFeatures(), staffApi.getAll()]);
      setGroups(toArr<AccessGroupDto>(g));
      setAllFeatures(toArr<FeatureDto>(f));
      setAllStaff(toArr<StaffDto>(s));
    } catch { setError("Failed to load access groups."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Seed from job titles
  const seedFromJobTitles = async () => {
    try {
      setSeeding(true); setSeedMsg(null);
      const titles = Array.from(new Set(allStaff.map(s => s.jobTitle).filter(Boolean))) as string[];
      const existing = new Set(groups.map(g => g.groupName.toLowerCase()));
      let created = 0;
      for (const t of titles) {
        if (existing.has(t.toLowerCase())) continue;
        try { await accessApi.createGroup({ groupName: t, description: `Auto-created group for ${t} role`, featureKeys: [] }); created++; }
        catch { /* skip */ }
      }
      await fetchAll();
      setSeedMsg(created > 0 ? `✅ Created ${created} group${created !== 1 ? "s" : ""} from job titles` : "ℹ️ All job title groups already exist");
      setTimeout(() => setSeedMsg(null), 4000);
    } catch { setSeedMsg("❌ Failed to seed groups"); }
    finally { setSeeding(false); }
  };

  const filtered = groups.filter(g => {
    const q = query.toLowerCase();
    return !q || g.groupName.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q);
  });

  const unseeded = Array.from(new Set(allStaff.map(s => s.jobTitle).filter(Boolean) as string[]))
    .filter(t => !groups.some(g => g.groupName.toLowerCase() === t.toLowerCase()));

  const handleDeleteGroup = async (group: AccessGroupDto) => {
    try { await accessApi.deleteGroup(group.groupId); await fetchAll(); setDeleteTarget(null); }
    catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message ?? "Failed to delete group.");
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">

      {/* ── Page header ── */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-0 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={18} className="text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Access Control</h1>
              <p className="text-xs font-medium text-slate-400">
                {tab === "groups"
                  ? `${groups.length} groups · ${allFeatures.length} total features`
                  : "Department-wise permission matrix"}
              </p>
            </div>
          </div>
          {tab === "groups" && (
            <div className="flex items-center gap-2">
              {unseeded.length > 0 && (
                <button onClick={seedFromJobTitles} disabled={seeding}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  title={`Create groups for: ${unseeded.join(", ")}`}>
                  {seeding ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  Seed from Job Titles ({unseeded.length})
                </button>
              )}
              <button onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-black text-white shadow-md hover:shadow-lg transition-all">
                <Plus size={15} /> Create Group
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {(["groups", "dept"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-all ${
                tab === t
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}>
              {t === "groups" ? "Access Groups" : "Dept Permissions"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-5">
        {tab === "groups" ? (
          /* ── GROUPS TAB ── */
          <div className="h-full flex flex-col">
            {seedMsg && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700 shrink-0">
                {seedMsg}
              </motion.div>
            )}

            {/* Unseeded hint */}
            {!loading && unseeded.length > 0 && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 shrink-0">
                <p className="text-xs font-black text-amber-700 mb-2">💡 {unseeded.length} job title{unseeded.length !== 1 ? "s" : ""} without a group:</p>
                <div className="flex flex-wrap gap-1.5">
                  {unseeded.map(t => (
                    <span key={t} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${roleBadge(t)}`}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="mb-4 relative max-w-sm shrink-0">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search groups…"
                className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10" />
              {query && <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
            </div>

            {error && <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-600 shrink-0"><AlertCircle size={15} /> {error}</div>}

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex h-full items-center justify-center"><Loader2 size={32} className="animate-spin text-indigo-500" /></div>
              ) : filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <Layers size={40} className="text-slate-200" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-slate-500">{query ? "No groups match" : "No access groups yet"}</p>
                  {!query && <button onClick={() => setCreateOpen(true)} className="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600">Create First Group</button>}
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50/95 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-6 py-4 text-left">Group Name</th>
                      <th className="border-b border-slate-200 px-6 py-4 text-left">Description</th>
                      <th className="border-b border-slate-200 px-6 py-4 text-center">Features</th>
                      <th className="border-b border-slate-200 px-6 py-4 text-center">Staff</th>
                      <th className="border-b border-slate-200 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g, idx) => (
                      <motion.tr key={g.groupId} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }} className="group transition-colors hover:bg-indigo-50/30">
                        <td className="border-b border-slate-100 px-6 py-3.5">
                          <button onClick={() => setViewTarget(g)} className="flex items-center gap-3 hover:text-indigo-600 transition-colors">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shrink-0 ${roleBadge(g.groupName)}`}>
                              {g.groupName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-800 group-hover:text-indigo-600">{g.groupName}</span>
                          </button>
                        </td>
                        <td className="border-b border-slate-100 px-6 py-3.5 text-xs font-medium text-slate-500 max-w-[220px]">
                          <span className="truncate block">{g.description || "—"}</span>
                        </td>
                        <td className="border-b border-slate-100 px-6 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                            <CheckSquare size={11} /> {toArr<string>(g.features).length}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-6 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-600 ring-1 ring-inset ring-sky-500/10">
                            <Users size={11} /> {g.staffCount}
                          </span>
                        </td>
                        <td className="border-b border-slate-100 px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button onClick={() => setEditTarget(g)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500"><Edit2 size={14} strokeWidth={2.5} /></button>
                            <button onClick={() => setDeleteTarget(g)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} strokeWidth={2.5} /></button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="mt-2 text-right text-[11px] font-bold text-slate-400 shrink-0">
              Showing {filtered.length} of {groups.length} group{groups.length !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          /* ── DEPT TAB ── */
          <DeptTab />
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {createOpen && <GroupModal mode="create" allFeatures={allFeatures} onClose={() => setCreateOpen(false)} onSaved={fetchAll} />}
        {editTarget && <GroupModal mode="edit" group={editTarget} allFeatures={allFeatures} onClose={() => setEditTarget(null)} onSaved={fetchAll} />}
        {deleteTarget && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto mb-4"><AlertTriangle size={28} className="text-red-500" /></div>
              <h2 className="text-center text-lg font-black text-slate-800">Delete Group?</h2>
              <p className="mt-2 text-center text-sm font-medium text-slate-500"><strong>{deleteTarget.groupName}</strong> will be permanently removed.</p>
              {deleteTarget.staffCount > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-700">
                  ⚠️ {deleteTarget.staffCount} staff will lose this group's access.
                </div>
              )}
              <div className="mt-6 flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200">Cancel</button>
                <button onClick={() => handleDeleteGroup(deleteTarget)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600">
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
        {viewTarget && (
          <GroupPanel group={viewTarget} allFeatures={allFeatures} allStaff={allStaff}
            onClose={() => setViewTarget(null)} onRefresh={fetchAll} />
        )}
      </AnimatePresence>
    </div>
  );
}
