/**
 * StaffPermissionsPage — Individual person permission management
 * Shows: profile, groups, effective permissions with source icons
 * CRUD: add/remove groups, set ALLOW/DENY overrides, remove overrides
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shield, Loader2, AlertCircle, Layers, Check, X,
  Save, Users, RefreshCw, UserPlus, UserMinus,
  Lock, Star, ShieldCheck, CheckSquare, Square, Trash2,
} from "lucide-react";
import { accessApi, type FeatureDto, type AccessGroupDto, type StaffGroupDto } from "../../api/accessApi";
import { rbacApi, type EffectivePermission, type OverrideStatus } from "../../api/rbacApi";
import { staffApi } from "../../api/staffApi";
import type { StaffDto } from "../../types";

// ── helpers ───────────────────────────────────────────────────────────────
function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items"]) if (Array.isArray(o[k])) return o[k] as T[];
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

// Source icon for each permission
function SourceIcon({ source }: { source: EffectivePermission["source"] }) {
  const props = { size: 11 } as const;
  if (source === "UserDeny")    return <span title="Explicitly Denied"><Lock    {...props} className="text-red-500"    /></span>;
  if (source === "UserAllow")   return <span title="Explicitly Allowed"><Star   {...props} className="text-amber-500"  /></span>;
  if (source === "RoleDefault") return <span title="From Role"><ShieldCheck     {...props} className="text-blue-500"   /></span>;
  if (source === "Matrix")      return <span title="From Matrix"><CheckSquare   {...props} className="text-indigo-500" /></span>;
  return <span title="Denied"><Square {...props} className="text-slate-300" /></span>;
}

const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500", "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Edit Permissions Modal (matches screenshot 2) ─────────────────────────
function EditPermsModal({ staffId, staffName, allFeatures, effectivePerms, onClose, onSaved }: {
  staffId: string;
  staffName: string;
  allFeatures: FeatureDto[];
  effectivePerms: EffectivePermission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // State: featureKey → "ALLOW" | "DENY" | "INHERIT"
  type S = "ALLOW" | "DENY" | "INHERIT";
  const [states, setStates] = useState<Record<string, S>>(() => {
    const m: Record<string, S> = {};
    effectivePerms.forEach(p => {
      if (p.source === "UserAllow") m[p.featureKey] = "ALLOW";
      else if (p.source === "UserDeny") m[p.featureKey] = "DENY";
      else m[p.featureKey] = "INHERIT";
    });
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const safe    = toArr<FeatureDto>(allFeatures);
  const grouped = groupByModule(safe);
  const modules = Object.keys(grouped);

  const allowCount = Object.values(states).filter(s => s === "ALLOW").length;
  const denyCount  = Object.values(states).filter(s => s === "DENY").length;

  const setFeature = (key: string, s: S) => setStates(p => ({ ...p, [key]: s }));

  const setModule = (mod: string, s: S) => {
    const keys = (grouped[mod] ?? []).map(f => f.featureKey);
    setStates(p => { const n = { ...p }; keys.forEach(k => { n[k] = s; }); return n; });
  };

  const handleSave = async () => {
    try {
      setSaving(true); setError(null);
      // Apply overrides: ALLOW → setOverride ALLOW, DENY → setOverride DENY, INHERIT → removeOverride
      await Promise.all(safe.map(async f => {
        const s = states[f.featureKey] ?? "INHERIT";
        const orig = effectivePerms.find(p => p.featureKey === f.featureKey);
        const origState: S = orig?.source === "UserAllow" ? "ALLOW" : orig?.source === "UserDeny" ? "DENY" : "INHERIT";
        if (s === origState) return; // no change
        if (s === "INHERIT") await rbacApi.removeOverride(staffId, f.featureKey).catch(() => {});
        else await rbacApi.setOverride(staffId, f.featureKey, s as OverrideStatus).catch(() => {});
      }));
      onSaved(); onClose();
    } catch { setError("Failed to save permissions."); }
    finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-800">Edit — {staffName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                <div className="h-3 w-3 rounded border-2 border-slate-300 bg-white" /> Inherit
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                <div className="h-3 w-3 rounded bg-indigo-500 border-2 border-indigo-500" /> Allow
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
                <div className="h-3 w-3 rounded bg-red-500 border-2 border-red-500" /> Deny
              </label>
              <span className="ml-2 text-[10px] font-bold text-slate-400">
                {allowCount} allow · {denyCount} deny
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
          {error && <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}
          {modules.map(mod => {
            const mf = grouped[mod] ?? [];
            const modAllow = mf.filter(f => states[f.featureKey] === "ALLOW").length;
            const modDeny  = mf.filter(f => states[f.featureKey] === "DENY").length;
            return (
              <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">{mod}</span>
                    <span className="text-[10px] text-slate-400">
                      {modAllow > 0 && <span className="text-indigo-500 font-bold">{modAllow}✓ </span>}
                      {modDeny  > 0 && <span className="text-red-500 font-bold">{modDeny}✗ </span>}
                      / {mf.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModule(mod, "ALLOW")} className="rounded px-2 py-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100">All Allow</button>
                    <button onClick={() => setModule(mod, "DENY")}  className="rounded px-2 py-0.5 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100">All Deny</button>
                    <button onClick={() => setModule(mod, "INHERIT")} className="rounded px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">Clear</button>
                  </div>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {mf.map(f => {
                    const s = states[f.featureKey] ?? "INHERIT";
                    return (
                      <div key={f.featureKey} className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                        s === "ALLOW" ? "bg-indigo-50 ring-1 ring-indigo-200"
                        : s === "DENY" ? "bg-red-50 ring-1 ring-red-200"
                        : "bg-white hover:bg-slate-50"
                      }`}>
                        {/* Tri-state toggle */}
                        <button onClick={() => {
                          const next: S = s === "INHERIT" ? "ALLOW" : s === "ALLOW" ? "DENY" : "INHERIT";
                          setFeature(f.featureKey, next);
                        }} className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          s === "ALLOW" ? "bg-indigo-500 border-indigo-500 text-white"
                          : s === "DENY" ? "bg-red-500 border-red-500 text-white"
                          : "border-slate-300 bg-white hover:border-slate-400"
                        }`}>
                          {s === "ALLOW" && <Check size={9} strokeWidth={3} />}
                          {s === "DENY"  && <X     size={9} strokeWidth={3} />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">{f.featureKey}</p>
                          <p className="text-xs font-semibold text-slate-700 truncate">{f.featureName}</p>
                        </div>
                        {s !== "INHERIT" && (
                          <span className={`shrink-0 text-[9px] font-black ${s === "ALLOW" ? "text-indigo-500" : "text-red-500"}`}>{s}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 shrink-0">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function StaffPermissionsPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const navigate    = useNavigate();

  const [staff, setStaff]               = useState<StaffDto | null>(null);
  const [allFeatures, setAllFeatures]   = useState<FeatureDto[]>([]);
  const [effectivePerms, setEffective]  = useState<EffectivePermission[]>([]);
  const [staffGroups, setStaffGroups]   = useState<StaffGroupDto[]>([]);
  const [allGroups, setAllGroups]       = useState<AccessGroupDto[]>([]);

  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Group assignment
  const [addingGroup, setAddingGroup]   = useState<number | null>(null);
  const [removingGroup, setRemovingGroup] = useState<number | null>(null);
  const [groupSearch, setGroupSearch]   = useState("");

  // Override actions
  const [overriding, setOverriding]     = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoading(true); setError(null);
      const [staffData, feats, sGroups, aGroups] = await Promise.all([
        staffApi.getById(staffId),
        accessApi.getAllFeatures(),
        accessApi.getStaffGroups(staffId),
        accessApi.getGroups(),
      ]);
      setStaff(staffData);
      setAllFeatures(toArr<FeatureDto>(feats));
      setStaffGroups(toArr<StaffGroupDto>(sGroups));
      setAllGroups(toArr<AccessGroupDto>(aGroups));

      // Effective permissions via RBAC
      try {
        const ep = await rbacApi.getEffectivePermissions(staffId);
        setEffective(toArr<EffectivePermission>(ep));
      } catch {
        // Fallback: use plain permissions
        const perms = await accessApi.getStaffPermissions(staffId);
        const keys  = toArr<string>(perms);
        const fake: EffectivePermission[] = toArr<FeatureDto>(feats).map(f => ({
          featureKey: f.featureKey, featureName: f.featureName, module: f.module,
          hasAccess: keys.includes(f.featureKey), source: "Matrix",
        }));
        setEffective(fake);
      }
    } catch { setError("Failed to load staff permissions."); }
    finally { setLoading(false); }
  }, [staffId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddGroup = async (groupId: number) => {
    if (!staffId) return;
    try { setAddingGroup(groupId); await accessApi.addStaffToGroup(staffId, groupId); await fetchAll(); }
    catch { /* silent */ } finally { setAddingGroup(null); }
  };

  const handleRemoveGroup = async (groupId: number) => {
    if (!staffId) return;
    try { setRemovingGroup(groupId); await accessApi.removeStaffFromGroup(staffId, groupId); await fetchAll(); }
    catch { /* silent */ } finally { setRemovingGroup(null); }
  };

  const handleGrantAll = async () => {
    if (!staffId) return;
    try { await accessApi.grantAll(staffId, "0"); await fetchAll(); } catch { /* silent */ }
  };

  const handleRevokeAll = async () => {
    if (!staffId) return;
    try { await accessApi.revokeAll(staffId); await fetchAll(); } catch { /* silent */ }
  };

  const handleRemoveOverride = async (featureKey: string) => {
    if (!staffId) return;
    try { setOverriding(featureKey); await rbacApi.removeOverride(staffId, featureKey); await fetchAll(); }
    catch { /* silent */ } finally { setOverriding(null); }
  };

  if (loading) return <div className="flex h-full w-full items-center justify-center bg-white"><Loader2 size={36} className="animate-spin text-indigo-500" /></div>;
  if (error || !staff) return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-white p-8">
      <AlertCircle size={40} className="text-red-400" />
      <p className="text-sm font-semibold text-slate-600">{error ?? "Staff not found."}</p>
      <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">Go Back</button>
    </div>
  );

  const safeFeatures = Array.isArray(allFeatures) ? allFeatures : [];
  const grouped      = groupByModule(safeFeatures);
  const modules      = Object.keys(grouped);
  const assignedIds  = new Set(staffGroups.map(g => g.groupId));
  const availableGroups = allGroups.filter(g => {
    if (assignedIds.has(g.groupId)) return false;
    const q = groupSearch.toLowerCase();
    return !q || g.groupName.toLowerCase().includes(q);
  });

  const allowedCount = effectivePerms.filter(p => p.hasAccess).length;
  const overrideCount = effectivePerms.filter(p => p.source === "UserAllow" || p.source === "UserDeny").length;

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Profile header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGrad(staff.fullName)} text-2xl font-black text-white shadow-md`}>
          {staff.fullName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-slate-800">{staff.fullName}</h1>
          <p className="text-sm font-semibold text-slate-400 mt-0.5">
            {staff.loginId} · {staff.jobTitle}{staff.department && ` · ${staff.department}`}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
              <Shield size={10} /> {allowedCount} / {safeFeatures.length} features
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-sky-600 ring-1 ring-inset ring-sky-500/10">
              <Layers size={10} /> {staffGroups.length} groups
            </span>
            {overrideCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-600 ring-1 ring-inset ring-amber-500/10">
                <Star size={10} /> {overrideCount} overrides
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchAll} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700">
            <Shield size={13} /> Edit Permissions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Groups + Quick Actions ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Assigned groups */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Access Groups</p>
              <span className="text-xs font-black text-indigo-500">{staffGroups.length}</span>
            </div>
            {staffGroups.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                <Layers size={24} className="mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">No groups assigned</p>
              </div>
            ) : (
              <div className="space-y-2">
                {staffGroups.map(g => (
                  <div key={g.groupId} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-black text-indigo-600">
                      {g.groupName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{g.groupName}</p>
                      <p className="text-[10px] text-slate-400">{toArr<string>(g.features).length} features</p>
                    </div>
                    <button onClick={() => handleRemoveGroup(g.groupId)} disabled={removingGroup === g.groupId}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Remove from group">
                      {removingGroup === g.groupId ? <Loader2 size={12} className="animate-spin" /> : <UserMinus size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add to group */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Add to Group</p>
              <input value={groupSearch} onChange={e => setGroupSearch(e.target.value)}
                placeholder="Search groups…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none mb-2" />
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {availableGroups.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">{groupSearch ? "No groups match" : "All groups assigned"}</p>
                ) : availableGroups.slice(0, 20).map(g => (
                  <div key={g.groupId} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-black text-slate-500">
                      {g.groupName.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-xs font-semibold text-slate-700 truncate">{g.groupName}</span>
                    <button onClick={() => handleAddGroup(g.groupId)} disabled={addingGroup === g.groupId}
                      className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50">
                      {addingGroup === g.groupId ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />} Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Quick Actions</p>
            <div className="space-y-2">
              <button onClick={handleGrantAll}
                className="w-full flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <CheckSquare size={13} /> Grant All Features
              </button>
              <button onClick={handleRevokeAll}
                className="w-full flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors">
                <Square size={13} /> Revoke All Features
              </button>
              <button onClick={() => setEditOpen(true)}
                className="w-full flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
                <Shield size={13} /> Edit Permissions
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Effective permissions by module ── */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Effective Permissions</p>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><Lock size={10} className="text-red-500" /> UserDeny</span>
                <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" /> UserAllow</span>
                <span className="flex items-center gap-1"><ShieldCheck size={10} className="text-blue-500" /> Role</span>
                <span className="flex items-center gap-1"><CheckSquare size={10} className="text-indigo-500" /> Matrix</span>
              </div>
            </div>

            {safeFeatures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Shield size={36} className="text-slate-200" strokeWidth={1.5} />
                <p className="text-sm font-bold text-slate-400">No features defined</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map(mod => {
                  const mf = grouped[mod] ?? [];
                  const modAllowed = mf.filter(f => effectivePerms.find(p => p.featureKey === f.featureKey)?.hasAccess).length;
                  return (
                    <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                        <span className="text-[10px] font-bold text-slate-400">{modAllowed}/{mf.length}</span>
                      </div>
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {mf.map(f => {
                          const ep = effectivePerms.find(p => p.featureKey === f.featureKey);
                          const has = ep?.hasAccess ?? false;
                          const src = ep?.source ?? "Denied";
                          const isOverride = src === "UserAllow" || src === "UserDeny";
                          return (
                            <div key={f.featureKey} className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all group ${
                              has ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-100"
                            }`}>
                              <SourceIcon source={src} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-slate-700 truncate">{f.featureName}</p>
                                <p className="text-[9px] font-mono text-slate-400 truncate">{f.featureKey}</p>
                              </div>
                              {/* Remove override button */}
                              {isOverride && (
                                <button onClick={() => handleRemoveOverride(f.featureKey)}
                                  disabled={overriding === f.featureKey}
                                  className="opacity-0 group-hover:opacity-100 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                  title="Remove override — revert to role default">
                                  {overriding === f.featureKey ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                                </button>
                              )}
                              <span className={`shrink-0 text-[9px] font-black ${has ? "text-emerald-500" : "text-slate-300"}`}>
                                {has ? "✓" : "✗"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {editOpen && staffId && (
          <EditPermsModal
            staffId={staffId}
            staffName={staff.fullName}
            allFeatures={safeFeatures}
            effectivePerms={effectivePerms}
            onClose={() => setEditOpen(false)}
            onSaved={fetchAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
