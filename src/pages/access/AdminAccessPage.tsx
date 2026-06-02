import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, ChevronRight, Check, X, Loader2,
  Users, ShieldCheck, Save, AlertCircle, User, RefreshCw,
  Shield, LayoutGrid, BookOpen, BarChart2, Settings,
  Building2, Calendar, Lock, Unlock,
} from "lucide-react";
import { accessApi, type FeatureDto } from "../../api/accessApi";
import { staffApi } from "../../api/staffApi";
import { rbacApi, type EffectivePermission } from "../../api/rbacApi";
import { menuApi, type ApiMenuItem } from "../../api/menuApi";
import { flattenMenuToFeatures } from "../../lib/utils";
import type { StaffDto } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────
function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items", "staff"])
      if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

// Module icon map
const MODULE_ICONS: Record<string, React.ReactNode> = {
  "HR Management":   <Users size={16} />,
  "Accounts":        <BarChart2 size={16} />,
  "Attendance":      <Calendar size={16} />,
  "Access":          <ShieldCheck size={16} />,
  "Organization":    <Building2 size={16} />,
  "Settings":        <Settings size={16} />,
  "Reports":         <BookOpen size={16} />,
  "Menu":            <LayoutGrid size={16} />,
  "General":         <LayoutGrid size={16} />,
};

const MODULE_COLORS: Record<string, string> = {
  "HR Management":  "bg-blue-50 border-blue-200 text-blue-700",
  "Accounts":       "bg-emerald-50 border-emerald-200 text-emerald-700",
  "Attendance":     "bg-violet-50 border-violet-200 text-violet-700",
  "Access":         "bg-rose-50 border-rose-200 text-rose-700",
  "Organization":   "bg-amber-50 border-amber-200 text-amber-700",
  "Settings":       "bg-slate-50 border-slate-200 text-slate-700",
  "Reports":        "bg-indigo-50 border-indigo-200 text-indigo-700",
  "Menu":           "bg-sky-50 border-sky-200 text-sky-700",
  "General":        "bg-gray-50 border-gray-200 text-gray-700",
};

function moduleColor(mod: string) {
  return MODULE_COLORS[mod] ?? "bg-slate-50 border-slate-200 text-slate-700";
}

function moduleIcon(mod: string) {
  return MODULE_ICONS[mod] ?? <LayoutGrid size={16} />;
}

// Readable label for a feature key: "HR_STAFF_VIEW" → "Staff View"
function featureLabel(key: string): string {
  return key
    .split("_")
    .slice(key.startsWith("MENU_") ? 1 : 2)
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ") || key;
}

// ── Types ─────────────────────────────────────────────────────────────────
interface PermState {
  [featureKey: string]: boolean; // true = granted, false = denied
}

// ── Staff Selector ────────────────────────────────────────────────────────
function StaffSelector({
  staff, selected, onSelect,
}: {
  staff: StaffDto[];
  selected: StaffDto | null;
  onSelect: (s: StaffDto) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return staff.filter(s =>
      !lq ||
      s.fullName.toLowerCase().includes(lq) ||
      (s.loginId ?? "").toLowerCase().includes(lq) ||
      s.jobTitle.toLowerCase().includes(lq) ||
      (s.department ?? "").toLowerCase().includes(lq)
    );
  }, [staff, q]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search staff…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none"
        />
        {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>}
      </div>
      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No staff found</div>
        ) : filtered.map(s => (
          <button key={s.staffId} onClick={() => onSelect(s)}
            className={`w-full text-left rounded-xl px-3 py-2.5 transition-all flex items-center gap-3 ${
              selected?.staffId === s.staffId
                ? "bg-indigo-600 text-white shadow-md"
                : "hover:bg-slate-50 border border-transparent hover:border-slate-200"
            }`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
              selected?.staffId === s.staffId ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
            }`}>
              {s.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate ${selected?.staffId === s.staffId ? "text-white" : "text-slate-800"}`}>
                {s.fullName}
              </p>
              <p className={`text-xs truncate ${selected?.staffId === s.staffId ? "text-white/70" : "text-slate-400"}`}>
                {s.jobTitle} {s.department ? `· ${s.department}` : ""}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Module Group (collapsible parent) ─────────────────────────────────────
function ModuleGroup({
  module, features, perms, onChange,
}: {
  module: string;
  features: FeatureDto[];
  perms: PermState;
  onChange: (key: string, val: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const grantedCount = features.filter(f => perms[f.featureKey]).length;
  const allGranted   = grantedCount === features.length;
  const noneGranted  = grantedCount === 0;
  const colorCls     = moduleColor(module);

  const grantAll  = () => features.forEach(f => onChange(f.featureKey, true));
  const revokeAll = () => features.forEach(f => onChange(f.featureKey, false));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Parent header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
      >
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${colorCls}`}>
          {moduleIcon(module)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800">{module}</p>
          <p className="text-xs text-slate-400">
            {grantedCount} / {features.length} granted
          </p>
        </div>
        {/* Progress pill */}
        <div className="shrink-0 flex items-center gap-2">
          <div className="hidden sm:block w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${features.length ? (grantedCount / features.length) * 100 : 0}%` }}
            />
          </div>
          {allGranted
            ? <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">All Granted</span>
            : noneGranted
            ? <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">No Access</span>
            : <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5">Partial</span>
          }
          {open ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        </div>
      </button>

      {/* Bulk actions row */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-2 bg-slate-50/50">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-auto">Features</span>
              <button onClick={grantAll}
                className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100">
                <Unlock size={10} /> Grant All
              </button>
              <button onClick={revokeAll}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-600 hover:bg-red-100">
                <Lock size={10} /> Revoke All
              </button>
            </div>

            {/* Child feature rows */}
            <div className="divide-y divide-slate-50">
              {features.map(f => {
                const granted = perms[f.featureKey] ?? false;
                return (
                  <div key={f.featureKey}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {f.featureName || featureLabel(f.featureKey)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{f.featureKey}</p>
                    </div>
                    {/* Badge */}
                    {f.featureKey.startsWith("MENU_")
                      ? <span className="shrink-0 text-[9px] font-black border border-sky-200 bg-sky-50 text-sky-600 rounded-full px-2 py-0.5">MENU</span>
                      : f.featureKey.includes("_VIEW") || f.featureKey.includes("_EDIT")
                      ? <span className="shrink-0 text-[9px] font-black border border-violet-200 bg-violet-50 text-violet-600 rounded-full px-2 py-0.5">PAGE</span>
                      : <span className="shrink-0 text-[9px] font-black border border-slate-200 bg-slate-50 text-slate-500 rounded-full px-2 py-0.5">FEATURE</span>
                    }
                    {/* Toggle */}
                    <button
                      onClick={() => onChange(f.featureKey, !granted)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all border ${
                        granted
                          ? "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-white border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500"
                      }`}>
                      {granted
                        ? <><Check size={11} strokeWidth={3} /> Granted</>
                        : <><X size={11} /> Denied</>
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AdminAccessPage() {
  const [staff,        setStaff]       = useState<StaffDto[]>([]);
  const [allFeatures,  setAllFeatures] = useState<FeatureDto[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffDto | null>(null);

  const [perms,    setPerms]    = useState<PermState>({});
  const [origPerms, setOrigPerms] = useState<PermState>({});

  const [loadingData,  setLoadingData]  = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);
  const [search,       setSearch]       = useState("");

  // ── Load staff + all features once ───────────────────────────────────────
  const loadInitial = useCallback(async () => {
    try {
      setLoadingData(true);
      const [staffRes, featRes, menuRes] = await Promise.all([
        staffApi.getAll(),
        accessApi.getAllFeatures().catch(() => []),
        menuApi.getSidebarTree().catch(() => [] as ApiMenuItem[]),
      ]);
      const menuFeats = flattenMenuToFeatures(toArr<ApiMenuItem>(menuRes));
      const apiFeats  = toArr<FeatureDto>(featRes);
      // Merge: prefer API features (have proper names), add menu features
      const seen = new Set(apiFeats.map(f => f.featureKey));
      const merged = [...apiFeats, ...menuFeats.filter(f => !seen.has(f.featureKey))];
      setAllFeatures(merged);
      setStaff(toArr<StaffDto>(staffRes));
    } catch {
      setError("Failed to load staff data.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // ── Load permissions when a staff member is selected ─────────────────────
  const loadPerms = useCallback(async (s: StaffDto) => {
    try {
      setLoadingPerms(true); setError(null); setSaveMsg(null);
      const effectivePerms: EffectivePermission[] = await rbacApi
        .getEffectivePermissions(s.staffId)
        .catch(() => []);

      const state: PermState = {};
      for (const p of effectivePerms) {
        state[p.featureKey] = p.hasAccess;
      }
      // Also default-false for features not in effective perms list
      for (const f of allFeatures) {
        if (!(f.featureKey in state)) state[f.featureKey] = false;
      }
      setPerms(state);
      setOrigPerms({ ...state });
    } catch {
      setError("Failed to load permissions for this user.");
    } finally {
      setLoadingPerms(false);
    }
  }, [allFeatures]);

  const handleSelectStaff = (s: StaffDto) => {
    setSelectedStaff(s);
    loadPerms(s);
  };

  // ── Change a single permission ────────────────────────────────────────────
  const handleChange = useCallback((key: string, val: boolean) => {
    setPerms(p => ({ ...p, [key]: val }));
  }, []);

  // ── Pending changes count ─────────────────────────────────────────────────
  const pendingCount = useMemo(() => {
    return Object.keys(perms).filter(k => perms[k] !== origPerms[k]).length;
  }, [perms, origPerms]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedStaff) return;
    try {
      setSaving(true); setError(null);
      // Changed keys only
      const changed = Object.keys(perms).filter(k => perms[k] !== origPerms[k]);
      await Promise.all(changed.map(k =>
        rbacApi.setOverride(selectedStaff.staffId, k, perms[k] ? "ALLOW" : "DENY")
      ));
      setOrigPerms({ ...perms });
      setSaveMsg(`✅ ${changed.length} permission${changed.length !== 1 ? "s" : ""} saved for ${selectedStaff.fullName}`);
      setTimeout(() => setSaveMsg(null), 4000);
    } catch {
      setError("Failed to save permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => setPerms({ ...origPerms });

  // ── Group features by module ──────────────────────────────────────────────
  const moduleGroups = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = allFeatures.filter(f =>
      !q ||
      (f.featureName || featureLabel(f.featureKey)).toLowerCase().includes(q) ||
      f.featureKey.toLowerCase().includes(q) ||
      (f.module || "").toLowerCase().includes(q)
    );
    const map: Record<string, FeatureDto[]> = {};
    for (const f of filtered) {
      const m = f.module || "General";
      (map[m] ??= []).push(f);
    }
    return map;
  }, [allFeatures, search]);

  const totalGranted = Object.values(perms).filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Access Manager</h1>
              <p className="text-xs text-slate-400">Select a staff member → grant or deny access per feature</p>
            </div>
          </div>
          {selectedStaff && (
            <div className="flex items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 border border-amber-200">
                  {pendingCount} unsaved change{pendingCount !== 1 ? "s" : ""}
                </span>
              )}
              <button onClick={handleReset} disabled={saving || pendingCount === 0}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                <RefreshCw size={12} /> Reset
              </button>
              <button onClick={handleSave} disabled={saving || pendingCount === 0}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body: Two-panel layout ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* ── LEFT: Staff list ── */}
        <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col p-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              Staff Members ({staff.length})
            </span>
          </div>
          {loadingData ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : (
            <StaffSelector staff={staff} selected={selectedStaff} onSelect={handleSelectStaff} />
          )}
        </div>

        {/* ── RIGHT: Permission panel ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* No staff selected */}
          {!selectedStaff ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="h-20 w-20 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <User size={36} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-700">Select a Staff Member</p>
                <p className="text-sm text-slate-400 mt-1">
                  Choose a person from the left panel to manage their access permissions.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {["HR Management", "Accounts", "Attendance", "Access", "Organization", "Settings"].map(m => (
                  <div key={m} className={`rounded-xl border px-3 py-2 text-xs font-bold flex items-center gap-2 ${moduleColor(m)}`}>
                    {moduleIcon(m)} {m}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Selected user header */}
              <div className="shrink-0 px-5 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                  {selectedStaff.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800">{selectedStaff.fullName}</p>
                  <p className="text-xs text-slate-400">{selectedStaff.jobTitle} {selectedStaff.department ? `· ${selectedStaff.department}` : ""}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-3 py-1 font-bold">
                    <Check size={11} /> {totalGranted} granted
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100 text-slate-600 rounded-full px-3 py-1 font-bold">
                    {allFeatures.length - totalGranted} denied
                  </span>
                </div>
              </div>

              {/* Search features */}
              <div className="shrink-0 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative max-w-sm">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search features, menus, pages…"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none"
                  />
                  {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>}
                </div>
              </div>

              {/* Banners */}
              <AnimatePresence>
                {saveMsg && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="shrink-0 mx-5 mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700">
                    <Check size={14} /> {saveMsg}
                  </motion.div>
                )}
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="shrink-0 mx-5 mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
                    <AlertCircle size={14} /> {error}
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={12} /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Module groups */}
              {loadingPerms ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={28} className="animate-spin text-indigo-400" />
                    <p className="text-sm text-slate-500">Loading permissions…</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {Object.keys(moduleGroups).length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                      <ShieldCheck size={40} className="text-slate-200" />
                      <p className="text-sm text-slate-400">No features match your search</p>
                    </div>
                  ) : (
                    Object.entries(moduleGroups)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([mod, feats]) => (
                        <ModuleGroup
                          key={mod}
                          module={mod}
                          features={feats}
                          perms={perms}
                          onChange={handleChange}
                        />
                      ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
