/**
 * GroupMatrixPage  /access/groups/matrix
 *
 * Group-wise permission matrix:
 * - Rows    = Access Groups
 * - Columns = All Features (API features + Menu items)
 * - Each cell = is this feature in the group's featureKeys list?
 * - Clicking a cell adds/removes the feature from the group
 * - "Save" batch-updates all changed groups via updateGroupFeatures
 *
 * Backend needed:
 *   GET  /api/access/groups          → AccessGroupDto[]
 *   GET  /api/access/features        → FeatureDto[]
 *   GET  /api/Menus/sidebar-tree     → ApiMenuItem[] (for MENU_* features)
 *   PUT  /api/access/groups/{id}/features  { featureKeys: string[] }
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, AlertCircle, Save, RotateCcw, CheckSquare, Square,
  Shield, Layers, Check, X, Search, ChevronDown, Plus,
  Users, ExternalLink, LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { accessApi, type AccessGroupDto, type FeatureDto, type CreateGroupDto } from "../../api/accessApi";
import { menuApi, type ApiMenuItem } from "../../api/menuApi";

// ── helpers ───────────────────────────────────────────────────────────────
function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items"]) if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

function flattenMenuToFeatures(items: ApiMenuItem[], prefix = ""): FeatureDto[] {
  const result: FeatureDto[] = [];
  for (const item of items) {
    const key  = `MENU_${item.id}`;
    const name = prefix ? `${prefix} › ${item.title}` : item.title;
    result.push({ featureKey: key, featureName: name, module: "Menu" });
    if (item.children?.length) result.push(...flattenMenuToFeatures(item.children, item.title));
  }
  return result;
}

function groupByModule(features: FeatureDto[]): Record<string, FeatureDto[]> {
  return features.reduce<Record<string, FeatureDto[]>>((acc, f) => {
    const m = f.module || "General";
    (acc[m] ??= []).push(f);
    return acc;
  }, {});
}

function shortLabel(key: string): string {
  const parts = key.split("_");
  return parts[parts.length - 1].slice(0, 6).toUpperCase();
}

const GRADS = [
  "from-indigo-400 to-violet-500", "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];
function grad(n: string) {
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) & 0xffffffff;
  return GRADS[Math.abs(h) % GRADS.length];
}

// ── Types ─────────────────────────────────────────────────────────────────
// Local state: groupId → featureKey → boolean
type GroupPermMap = Record<number, Record<string, boolean>>;

function buildGroupPermMap(groups: AccessGroupDto[]): GroupPermMap {
  const map: GroupPermMap = {};
  for (const g of groups) {
    map[g.groupId] = {};
    for (const fk of toArr<string>(g.features)) {
      map[g.groupId][fk] = true;
    }
  }
  return map;
}

// ── Create Group Modal ────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName]   = useState("");
  const [desc, setDesc]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) { setErr("Group name is required."); return; }
    try {
      setSaving(true); setErr(null);
      await accessApi.createGroup({ groupName: name.trim(), description: desc.trim() || undefined, featureKeys: [] });
      onSaved(); onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er.response?.data?.message ?? "Failed to create group.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50"><Shield size={18} className="text-indigo-500" /></div>
            <h2 className="text-base font-black text-slate-800">Create Access Group</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {err && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{err}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Group Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g. Agent, Manager, HR Team" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none" placeholder="What access does this group provide?" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Group
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function GroupMatrixPage() {
  const navigate = useNavigate();

  const [groups,      setGroups]      = useState<AccessGroupDto[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDto[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [createOpen,  setCreateOpen]  = useState(false);
  const [query,       setQuery]       = useState("");

  // Local pending state: groupId → featureKey → bool
  const [localPerms,    setLocalPerms]    = useState<GroupPermMap>({});
  const [originalPerms, setOriginalPerms] = useState<GroupPermMap>({});

  // Module filter
  const [activeModule, setActiveModule] = useState<string>("All");

  const tableRef = useRef<HTMLDivElement>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [g, f, menus] = await Promise.all([
        accessApi.getGroups(),
        accessApi.getAllFeatures(),
        menuApi.getSidebarTree().catch(() => [] as ApiMenuItem[]),
      ]);
      const grps  = toArr<AccessGroupDto>(g);
      const feats = toArr<FeatureDto>(f);
      const menuFeats = flattenMenuToFeatures(toArr<ApiMenuItem>(menus));
      const allFeats  = [...feats, ...menuFeats];

      setGroups(grps);
      setAllFeatures(allFeats);

      const perms = buildGroupPermMap(grps);
      setLocalPerms(perms);
      setOriginalPerms(JSON.parse(JSON.stringify(perms)));
    } catch {
      setError("Failed to load group matrix.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived ─────────────────────────────────────────────────────────────
  const grouped  = useMemo(() => groupByModule(allFeatures), [allFeatures]);
  const modules  = useMemo(() => Object.keys(grouped), [grouped]);

  const visibleFeatures = useMemo(() => {
    if (activeModule === "All") return allFeatures;
    return grouped[activeModule] ?? [];
  }, [activeModule, allFeatures, grouped]);

  const filteredGroups = useMemo(() => {
    const q = query.toLowerCase();
    return groups.filter(g => !q || g.groupName.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q));
  }, [groups, query]);

  // Count pending changes
  const pendingCount = useMemo(() => {
    let count = 0;
    for (const gid of Object.keys(localPerms)) {
      const id = Number(gid);
      for (const fk of Object.keys(localPerms[id] ?? {})) {
        const cur  = localPerms[id]?.[fk]  ?? false;
        const orig = originalPerms[id]?.[fk] ?? false;
        if (cur !== orig) count++;
      }
    }
    return count;
  }, [localPerms, originalPerms]);

  // ── Cell toggle ──────────────────────────────────────────────────────────
  const toggleCell = useCallback((groupId: number, fk: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [groupId]: { ...prev[groupId], [fk]: !(prev[groupId]?.[fk] ?? false) },
    }));
  }, []);

  // ── Select / clear entire row (group) ───────────────────────────────────
  const selectAllRow = useCallback((groupId: number) => {
    setLocalPerms(prev => ({
      ...prev,
      [groupId]: Object.fromEntries(allFeatures.map(f => [f.featureKey, true])),
    }));
  }, [allFeatures]);

  const clearRow = useCallback((groupId: number) => {
    setLocalPerms(prev => ({
      ...prev,
      [groupId]: Object.fromEntries(allFeatures.map(f => [f.featureKey, false])),
    }));
  }, [allFeatures]);

  // ── Select / clear entire column (feature) ──────────────────────────────
  const selectAllCol = useCallback((fk: string) => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const g of groups) next[g.groupId] = { ...next[g.groupId], [fk]: true };
      return next;
    });
  }, [groups]);

  const clearCol = useCallback((fk: string) => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const g of groups) next[g.groupId] = { ...next[g.groupId], [fk]: false };
      return next;
    });
  }, [groups]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setLocalPerms(JSON.parse(JSON.stringify(originalPerms)));
  }, [originalPerms]);

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setSaving(true); setError(null);
      // Only save groups that have changes
      const changedGroups = groups.filter(g => {
        for (const fk of allFeatures.map(f => f.featureKey)) {
          if ((localPerms[g.groupId]?.[fk] ?? false) !== (originalPerms[g.groupId]?.[fk] ?? false)) return true;
        }
        return false;
      });

      await Promise.all(changedGroups.map(g => {
        const featureKeys = allFeatures
          .filter(f => localPerms[g.groupId]?.[f.featureKey] ?? false)
          .map(f => f.featureKey);
        return accessApi.updateGroupFeatures(g.groupId, { featureKeys });
      }));

      setOriginalPerms(JSON.parse(JSON.stringify(localPerms)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Reload to get fresh staffCount etc.
      await loadAll();
    } catch {
      setError("Failed to save group permissions. Please try again.");
    } finally { setSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">

      {/* ── Top bar ── */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
              <Layers size={18} className="text-indigo-500" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">Group Permission Matrix</h1>
              <p className="text-xs font-medium text-slate-400">
                {groups.length} groups · {allFeatures.length} features ·{" "}
                <span className="text-sky-500 font-bold">blue ring</span> = unsaved change
              </p>
            </div>
          </div>
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
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100">
              <Plus size={12} /> New Group
            </button>
            <button onClick={handleSave} disabled={saving || loading || pendingCount === 0}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Toolbar: search + module filter */}
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search groups…"
              className="rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none min-w-[180px]" />
            {query && <button onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>}
          </div>

          {/* Module tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {["All", ...modules].map(mod => (
              <button key={mod} onClick={() => setActiveModule(mod)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeModule === mod
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
                {mod === "Menu" ? <span className="flex items-center gap-1"><LayoutGrid size={10} /> {mod}</span> : mod}
              </button>
            ))}
          </div>

          <span className="ml-auto text-[11px] font-bold text-slate-400">
            {filteredGroups.length} group{filteredGroups.length !== 1 ? "s" : ""} · {visibleFeatures.length} feature{visibleFeatures.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* ── Banners ── */}
      <div className="shrink-0 px-5 lg:px-8">
        <AnimatePresence>
          {saveSuccess && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700">
              <Check size={14} /> Group permissions saved successfully
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
        ) : groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
            <Layers size={40} className="text-slate-200" strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-500">No access groups yet</p>
            <button onClick={() => setCreateOpen(true)} className="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600">Create First Group</button>
          </div>
        ) : visibleFeatures.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
            <Shield size={40} className="text-slate-200" strokeWidth={1.5} />
            <p className="text-sm font-bold text-slate-500">No features in this module</p>
          </div>
        ) : (
          <div ref={tableRef} className="h-full overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-sm">

              {/* ── Column headers ── */}
              <thead className="sticky top-0 z-20 bg-white shadow-sm">
                <tr>
                  {/* Group name column */}
                  <th className="border-b border-slate-200 px-4 py-3 text-left min-w-[200px] bg-white">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Access Group</span>
                  </th>
                  {/* Feature columns */}
                  {visibleFeatures.map(f => (
                    <th key={f.featureKey}
                      className="border-b border-l border-slate-200 px-2 py-2 text-center min-w-[52px] group/col"
                      title={`${f.featureName}\n${f.featureKey}`}>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                          {shortLabel(f.featureKey)}
                        </span>
                        {/* Column select/clear on hover */}
                        <div className="flex gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
                          <button onClick={() => selectAllCol(f.featureKey)} title="Grant all groups"
                            className="rounded p-0.5 text-emerald-500 hover:bg-emerald-50"><CheckSquare size={9} /></button>
                          <button onClick={() => clearCol(f.featureKey)} title="Revoke all groups"
                            className="rounded p-0.5 text-red-400 hover:bg-red-50"><Square size={9} /></button>
                        </div>
                      </div>
                    </th>
                  ))}
                  {/* Row actions column */}
                  <th className="border-b border-l border-slate-200 px-3 py-3 text-center min-w-[70px] bg-white sticky right-0 z-30">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Row</span>
                  </th>
                </tr>
              </thead>

              {/* ── Body: one row per group ── */}
              <tbody>
                {filteredGroups.map((g, idx) => {
                  const rowPerms = localPerms[g.groupId] ?? {};
                  const origRow  = originalPerms[g.groupId] ?? {};
                  const grantedCount = visibleFeatures.filter(f => rowPerms[f.featureKey]).length;
                  const pendingRow   = visibleFeatures.filter(f => (rowPerms[f.featureKey] ?? false) !== (origRow[f.featureKey] ?? false)).length;

                  return (
                    <tr key={g.groupId}
                      className={`group/row transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-indigo-50/20`}>

                      {/* Group info */}
                      <td className="border-b border-slate-100 px-4 py-3 min-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white bg-gradient-to-br ${grad(g.groupName)}`}>
                            {g.groupName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black text-slate-800 truncate max-w-[110px]">{g.groupName}</p>
                              {pendingRow > 0 && (
                                <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[8px] font-black text-sky-600">{pendingRow}✎</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] font-bold text-slate-400">{grantedCount}/{visibleFeatures.length} granted</span>
                              <span className="text-[9px] text-slate-300">·</span>
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5"><Users size={8} /> {g.staffCount}</span>
                            </div>
                          </div>
                          <button onClick={() => navigate(`/access/groups`)} title="View group details"
                            className="ml-auto shrink-0 rounded-md p-1 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors opacity-0 group-hover/row:opacity-100">
                            <ExternalLink size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Feature checkboxes */}
                      {visibleFeatures.map(f => {
                        const checked  = rowPerms[f.featureKey] ?? false;
                        const isDirty  = checked !== (origRow[f.featureKey] ?? false);
                        return (
                          <td key={f.featureKey} className="border-b border-l border-slate-100 px-2 py-3 text-center">
                            <button
                              onClick={() => toggleCell(g.groupId, f.featureKey)}
                              title={`${checked ? "Revoke" : "Grant"} "${f.featureName}" for ${g.groupName}`}
                              className={`h-5 w-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all hover:scale-110 active:scale-95 ${
                                checked
                                  ? "bg-indigo-500 border-indigo-500 text-white"
                                  : "border-slate-200 bg-white hover:border-indigo-400"
                              } ${isDirty ? "ring-2 ring-offset-1 ring-sky-400" : ""}`}>
                              {checked && <Check size={10} strokeWidth={3} />}
                            </button>
                          </td>
                        );
                      })}

                      {/* Row actions */}
                      <td className="border-b border-l border-slate-100 px-2 py-3 text-center sticky right-0 bg-white group-hover/row:bg-indigo-50/20 transition-colors z-10">
                        <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button onClick={() => selectAllRow(g.groupId)} title="Grant all features"
                            className="rounded p-1 text-emerald-500 hover:bg-emerald-50 transition-colors">
                            <CheckSquare size={12} />
                          </button>
                          <button onClick={() => clearRow(g.groupId)} title="Revoke all features"
                            className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors">
                            <Square size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer legend */}
            <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-5 py-2.5 flex items-center gap-6 text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center"><Check size={8} strokeWidth={3} className="text-white" /></div>
                Granted
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded border-2 border-slate-200 bg-white" />
                Not granted
              </span>
              <span className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded border-2 bg-indigo-500 border-indigo-500 ring-2 ring-sky-400 ring-offset-1" />
                Unsaved change
              </span>
              <span className="ml-auto">{filteredGroups.length} groups · {visibleFeatures.length} features shown</span>
            </div>
          </div>
        )}
      </div>

      {/* Create group modal */}
      <AnimatePresence>
        {createOpen && (
          <CreateGroupModal onClose={() => setCreateOpen(false)} onSaved={loadAll} />
        )}
      </AnimatePresence>
    </div>
  );
}
