/**
 * StaffAccessListPage  /access/groups
 *
 * Shows every staff member with a summary of their current access.
 * Admin can click any row to open an edit drawer and update permissions.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, Shield, Check,
  ChevronRight, ChevronDown, Eye, Plus, Pencil, Trash2,
  Users, AlertCircle, Save, RefreshCw, LayoutGrid,
  CheckSquare, Square,
} from "lucide-react";
import { staffApi } from "../../api/staffApi";
import { rbacApi, type EffectivePermission } from "../../api/rbacApi";
import { menuApi, type ApiMenuItem } from "../../api/menuApi";
import { saveBooleanPermissionChanges } from "../../api/permissionSave";
import { getApiErrorMessage } from "../../api/apiErrors";
import type { StaffDto } from "../../types";

// ── helpers ───────────────────────────────────────────────────────────────
function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items", "staff"])
      if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

// ── Avatar gradient ───────────────────────────────────────────────────────
const GRADS = [
  "from-indigo-400 to-violet-500", "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];
function avatarGrad(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return GRADS[Math.abs(h) % GRADS.length];
}

// ── Types ─────────────────────────────────────────────────────────────────
type PermState = Record<string, boolean>;

interface MenuSection {
  id: number;
  title: string;
  route?: string | null;
  featureKey: string;
  children: MenuSection[];
}

const CRUD = [
  { key: "VIEW",   label: "View",   icon: Eye,    active: "text-sky-700 bg-sky-100 border-sky-300",    inactive: "text-slate-400 bg-white border-slate-200" },
  { key: "ADD",    label: "Add",    icon: Plus,   active: "text-emerald-700 bg-emerald-100 border-emerald-300", inactive: "text-slate-400 bg-white border-slate-200" },
  { key: "EDIT",   label: "Edit",   icon: Pencil, active: "text-amber-700 bg-amber-100 border-amber-300",  inactive: "text-slate-400 bg-white border-slate-200" },
  { key: "DELETE", label: "Delete", icon: Trash2, active: "text-red-700 bg-red-100 border-red-300",     inactive: "text-slate-400 bg-white border-slate-200" },
] as const;
type CrudKey = "VIEW" | "ADD" | "EDIT" | "DELETE";

function crudKey(menuId: number, action: CrudKey) { return `MENU_${menuId}_${action}`; }

function buildMenuSections(items: ApiMenuItem[]): MenuSection[] {
  return items.map(item => ({
    id: item.id, title: item.title, route: item.route,
    featureKey: `MENU_${item.id}`,
    children: item.children ? buildMenuSections(item.children) : [],
  }));
}

function flattenSections(sections: MenuSection[]): MenuSection[] {
  const out: MenuSection[] = [];
  for (const s of sections) { out.push(s); if (s.children.length) out.push(...flattenSections(s.children)); }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════
// ACCESS SUMMARY BADGE — compact chip shown in the staff table row
// ══════════════════════════════════════════════════════════════════════════
function AccessSummary({ grantedCount, totalMenus }: { grantedCount: number; totalMenus: number }) {
  if (grantedCount === 0)
    return <span className="text-[11px] font-bold text-slate-400 bg-slate-100 rounded-full px-2.5 py-1">No access</span>;
  const pct = Math.round((grantedCount / Math.max(totalMenus, 1)) * 100);
  const color = pct >= 70 ? "bg-emerald-100 text-emerald-700" : pct >= 30 ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700";
  return (
    <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 ${color}`}>
      {grantedCount} menu{grantedCount !== 1 ? "s" : ""} · {pct}%
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// EDIT DRAWER — slide-in panel for editing one staff member's permissions
// ══════════════════════════════════════════════════════════════════════════
function EditDrawer({
  staff, menuSections, onClose, onSaved,
}: {
  staff: StaffDto;
  menuSections: MenuSection[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const allSections = useMemo(() => flattenSections(menuSections), [menuSections]);

  const [perms, setPerms]       = useState<PermState>({});
  const [origPerms, setOrigPerms] = useState<PermState>({});
  const [sources, setSources]   = useState<Record<string, EffectivePermission["source"]>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [saved, setSaved]       = useState(false);

  // Load current permissions
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const ep = await rbacApi.getEffectivePermissions(staff.staffId).catch(() => []);
        if (cancelled) return;
        const state: PermState = {};
        const srcMap: Record<string, EffectivePermission["source"]> = {};
        for (const p of ep) { state[p.featureKey] = p.hasAccess; srcMap[p.featureKey] = p.source; }
        setPerms(state);
        setOrigPerms({ ...state });
        setSources(srcMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [staff.staffId]);

  const toggle = useCallback((key: string, val: boolean) => {
    setPerms(p => ({ ...p, [key]: val }));
    // When granting menu access, auto-grant VIEW crud
    if (key.startsWith("MENU_") && !key.includes("_VIEW") && !key.includes("_ADD") && !key.includes("_EDIT") && !key.includes("_DELETE")) {
      const id = parseInt(key.replace("MENU_", ""));
      if (!isNaN(id) && val) {
        setPerms(p => ({ ...p, [key]: val, [crudKey(id, "VIEW")]: true }));
      }
    }
  }, []);

  const pendingCount = useMemo(
    () => Object.keys(perms).filter(k => perms[k] !== (origPerms[k] ?? false)).length,
    [perms, origPerms]
  );

  const handleSave = async () => {
    try {
      setSaving(true); setError(null);
      const changed = Object.keys(perms).filter(k => perms[k] !== (origPerms[k] ?? false));
      if (changed.length === 0) { setSaving(false); return; }
      const result = await saveBooleanPermissionChanges(
        staff.staffId,
        changed.map(featureKey => ({
          featureKey,
          granted: perms[featureKey],
          previousGranted: origPerms[featureKey] ?? false,
          source: sources[featureKey],
        }))
      );
      if (result.failed.length > 0) {
        setError(`${result.ok} saved, ${result.failed.length} failed.`);
      } else {
        setOrigPerms({ ...perms });
        setSaved(true);
        window.dispatchEvent(new CustomEvent("navigation-updated"));
        setTimeout(() => { setSaved(false); onSaved(); onClose(); }, 1200);
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to save.");
    } finally { setSaving(false); }
  };

  const grantedMenus   = allSections.filter(s => perms[s.featureKey] ?? false);
  const grantedCount   = grantedMenus.length;

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${avatarGrad(staff.fullName)} text-sm font-black text-white`}>
            {staff.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black text-slate-800 truncate">{staff.fullName}</p>
            <p className="text-xs text-slate-400">{staff.jobTitle}{staff.department ? ` · ${staff.department}` : ""} · {staff.loginId}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pendingCount > 0 && !saved && (
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                {pendingCount} unsaved
              </span>
            )}
            {saved && (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Check size={9} strokeWidth={3} /> Saved
              </span>
            )}
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center gap-3 flex-col">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading permissions…</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-3 text-center">
                <p className="text-2xl font-black text-indigo-600">{grantedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Menus Granted</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                <p className="text-2xl font-black text-slate-600">{allSections.length - grantedCount}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No Access</p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
                <AlertCircle size={14} /> {error}
                <button onClick={() => setError(null)} className="ml-auto text-red-400"><X size={12} /></button>
              </div>
            )}

            {/* Menu sections with CRUD */}
            {menuSections.map(section => (
              <DrawerMenuSection key={section.id} section={section} perms={perms} onToggle={toggle} depth={0} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/60">
          <button onClick={onClose} disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || pendingCount === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : `Save Changes${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Menu section with CRUD toggles inside the drawer ─────────────────────
function DrawerMenuSection({ section, perms, onToggle, depth }: {
  section: MenuSection; perms: PermState;
  onToggle: (key: string, val: boolean) => void; depth: number;
}) {
  const [open, setOpen] = useState(true);
  const granted = perms[section.featureKey] ?? false;
  const hasChildren = section.children.length > 0;
  const childGranted = section.children.filter(c => perms[c.featureKey] ?? false).length;
  const allChildGranted = hasChildren && childGranted === section.children.length;
  const partialChild = hasChildren && childGranted > 0 && !allChildGranted;
  const visualGranted = granted || allChildGranted;

  const handleMenuToggle = () => {
    const newVal = !granted;
    onToggle(section.featureKey, newVal);
    if (hasChildren) section.children.forEach(c => onToggle(c.featureKey, newVal));
    // Auto-grant VIEW when enabling
    if (newVal) onToggle(crudKey(section.id, "VIEW"), true);
    else CRUD.forEach(c => onToggle(crudKey(section.id, c.key as CrudKey), false));
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      visualGranted ? "border-indigo-100 shadow-sm" : "border-slate-100 bg-slate-50/40"
    }`}>
      {/* Menu header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {hasChildren && (
          <button onClick={() => setOpen(o => !o)} className="shrink-0 text-slate-400 hover:text-slate-600">
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}

        {/* Checkbox */}
        <button onClick={handleMenuToggle}
          className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            visualGranted ? "bg-indigo-500 border-indigo-500 text-white" :
            partialChild ? "bg-indigo-200 border-indigo-400" :
            "border-slate-300 bg-white hover:border-indigo-400"
          }`}>
          {visualGranted && <Check size={10} strokeWidth={3} />}
          {partialChild && <div className="h-1.5 w-1.5 rounded-sm bg-indigo-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${visualGranted ? "text-slate-800" : "text-slate-500"}`}>
            {section.title}
          </p>
          {section.route && <p className="text-[10px] font-mono text-slate-400 truncate">{section.route}</p>}
        </div>

        <span className={`shrink-0 text-[10px] font-black rounded-full px-2 py-0.5 ${
          visualGranted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        }`}>
          {visualGranted ? "Granted" : "No access"}
        </span>
      </div>

      {/* CRUD toggles (only when menu is granted) */}
      {granted && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-slate-50">
          <p className="w-full text-[10px] font-black uppercase tracking-widest text-slate-400 pt-2 mb-0.5">Permissions</p>
          {CRUD.map(({ key, label, icon: Icon, active, inactive }) => {
            const fk = crudKey(section.id, key as CrudKey);
            const isActive = perms[fk] ?? false;
            return (
              <button key={key} onClick={() => onToggle(fk, !isActive)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition-all ${isActive ? active : inactive} hover:scale-105 active:scale-95`}>
                <Icon size={11} strokeWidth={2.5} />
                {label}
                {isActive && <Check size={9} strokeWidth={3} className="ml-0.5" />}
              </button>
            );
          })}
          {/* Quick Grant All / Clear */}
          <button onClick={() => CRUD.forEach(c => onToggle(crudKey(section.id, c.key as CrudKey), true))}
            className="flex items-center gap-1 rounded-xl border border-dashed border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all">
            <CheckSquare size={10} /> All
          </button>
          <button onClick={() => CRUD.forEach(c => onToggle(crudKey(section.id, c.key as CrudKey), false))}
            className="flex items-center gap-1 rounded-xl border border-dashed border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-400 hover:border-red-300 hover:text-red-500 transition-all">
            <Square size={10} /> None
          </button>
        </div>
      )}

      {/* Nested children */}
      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className={`ml-4 border-l-2 border-slate-100 pl-2 pb-2 space-y-2 ${depth > 0 ? "mt-1" : "mt-0"}`}>
              {section.children.map(child => (
                <DrawerMenuSection key={child.id} section={child} perms={perms} onToggle={onToggle} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
interface StaffAccessRow {
  staff: StaffDto;
  grantedMenus: number;
  grantedCrud: number;
  loaded: boolean;
}

export default function StaffAccessListPage() {
  const [staffList,    setStaffList]    = useState<StaffDto[]>([]);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [accessMap,    setAccessMap]    = useState<Record<string, EffectivePermission[]>>({});
  const [loadingList,  setLoadingList]  = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [query,        setQuery]        = useState("");
  const [roleFilter,   setRoleFilter]   = useState("");
  const [editTarget,   setEditTarget]   = useState<StaffDto | null>(null);

  const allSections = useMemo(() => flattenSections(menuSections), [menuSections]);

  // ── Load staff + menu tree ───────────────────────────────────────────────
  const loadList = useCallback(async () => {
    try {
      setLoadingList(true); setError(null);
      const [staffRes, menuRes] = await Promise.all([
        staffApi.getAll(),
        menuApi.getSidebarTree().catch(() => [] as ApiMenuItem[]),
      ]);
      setStaffList(toArr<StaffDto>(staffRes));
      setMenuSections(buildMenuSections(toArr<ApiMenuItem>(menuRes)));
    } catch {
      setError("Failed to load staff list.");
    } finally { setLoadingList(false); }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Batch load permissions for all staff ────────────────────────────────
  const loadAllPerms = useCallback(async (list: StaffDto[]) => {
    if (list.length === 0) return;
    setLoadingPerms(true);
    const results = await Promise.allSettled(
      list.map(s => rbacApi.getEffectivePermissions(s.staffId).then(ep => ({ staffId: s.staffId, ep })))
    );
    const map: Record<string, EffectivePermission[]> = {};
    for (const r of results) {
      if (r.status === "fulfilled") map[r.value.staffId] = r.value.ep;
    }
    setAccessMap(map);
    setLoadingPerms(false);
  }, []);

  useEffect(() => {
    if (staffList.length > 0) loadAllPerms(staffList);
  }, [staffList, loadAllPerms]);

  // ── Derived list ─────────────────────────────────────────────────────────
  const rows: StaffAccessRow[] = useMemo(() => {
    return staffList.map(staff => {
      const ep = accessMap[staff.staffId] ?? [];
      const loaded = !!accessMap[staff.staffId];
      const grantedMenus = allSections.filter(s => ep.find(p => p.featureKey === s.featureKey)?.hasAccess).length;
      const grantedCrud  = ep.filter(p =>
        (p.featureKey.includes("_VIEW") || p.featureKey.includes("_ADD") ||
         p.featureKey.includes("_EDIT") || p.featureKey.includes("_DELETE")) && p.hasAccess
      ).length;
      return { staff, grantedMenus, grantedCrud, loaded };
    });
  }, [staffList, accessMap, allSections]);

  const roles = useMemo(() =>
    Array.from(new Set(staffList.map(s => s.jobTitle).filter(Boolean) as string[])).sort(),
    [staffList]
  );

  const filtered = useMemo(() => {
    const lq = query.toLowerCase();
    return rows.filter(r => {
      const matchQ = !lq ||
        r.staff.fullName.toLowerCase().includes(lq) ||
        (r.staff.loginId ?? "").toLowerCase().includes(lq) ||
        r.staff.jobTitle.toLowerCase().includes(lq) ||
        (r.staff.department ?? "").toLowerCase().includes(lq);
      const matchRole = !roleFilter || r.staff.jobTitle === roleFilter;
      return matchQ && matchRole;
    });
  }, [rows, query, roleFilter]);

  const handleEditClose = useCallback(() => setEditTarget(null), []);
  const handleEditSaved = useCallback(() => {
    loadAllPerms(staffList);
  }, [staffList, loadAllPerms]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">

      {/* Header */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
              <Users size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Staff Access Overview</h1>
              <p className="text-xs text-slate-400">
                {staffList.length} staff member{staffList.length !== 1 ? "s" : ""} · click any row to edit access
              </p>
            </div>
          </div>
          <button onClick={loadList} disabled={loadingList}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loadingList ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, login ID, job title…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none" />
            {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>}
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none min-w-[150px]">
            <option value="">All Roles</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="shrink-0 mx-5 lg:mx-8 mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-4">
        {loadingList ? (
          <div className="flex h-full items-center justify-center gap-3 flex-col">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading staff…</p>
          </div>
        ) : (
          <div className="h-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50/95">
                <tr>
                  <th className="border-b border-slate-200 px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Staff Member</th>
                  <th className="border-b border-slate-200 px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-500 hidden md:table-cell">Role / Department</th>
                  <th className="border-b border-slate-200 px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest text-slate-500">Access Level</th>
                  <th className="border-b border-slate-200 px-5 py-3.5 text-center text-[11px] font-black uppercase tracking-widest text-slate-500 hidden lg:table-cell">Permissions</th>
                  <th className="border-b border-slate-200 px-5 py-3.5 text-right text-[11px] font-black uppercase tracking-widest text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-slate-400">
                      <Users size={32} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-sm font-bold">No staff found</p>
                    </td>
                  </tr>
                ) : filtered.map(({ staff, grantedMenus, grantedCrud, loaded }, idx) => (
                  <motion.tr key={staff.staffId}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className="group hover:bg-indigo-50/30 transition-colors cursor-pointer"
                    onClick={() => setEditTarget(staff)}>

                    {/* Staff info */}
                    <td className="border-b border-slate-100 px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(staff.fullName)} text-xs font-black text-white`}>
                          {staff.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{staff.fullName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{staff.loginId}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="border-b border-slate-100 px-5 py-3.5 hidden md:table-cell">
                      <p className="text-sm font-semibold text-slate-600 truncate">{staff.jobTitle}</p>
                      {staff.department && <p className="text-[11px] text-slate-400 truncate">{staff.department}</p>}
                    </td>

                    {/* Access summary */}
                    <td className="border-b border-slate-100 px-5 py-3.5">
                      {!loaded ? (
                        <Loader2 size={14} className="animate-spin text-slate-300" />
                      ) : (
                        <AccessSummary grantedCount={grantedMenus} totalMenus={allSections.length} />
                      )}
                    </td>

                    {/* CRUD count */}
                    <td className="border-b border-slate-100 px-5 py-3.5 text-center hidden lg:table-cell">
                      {!loaded ? (
                        <span className="text-[11px] text-slate-300">…</span>
                      ) : (
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {CRUD.map(({ key, label, icon: Icon }) => {
                            const count = menuSections.reduce((n, s) => {
                              const flat = flattenSections([s]);
                              return n + flat.filter(m => accessMap[staff.staffId]?.find(p => p.featureKey === crudKey(m.id, key as CrudKey))?.hasAccess).length;
                            }, 0);
                            return count > 0 ? (
                              <span key={key} className="flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-md px-1.5 py-0.5" title={label}>
                                <Icon size={9} /> {count}
                              </span>
                            ) : null;
                          })}
                          {CRUD.every(({ key }) => !menuSections.some(s => flattenSections([s]).some(m => accessMap[staff.staffId]?.find(p => p.featureKey === crudKey(m.id, key as CrudKey))?.hasAccess))) && (
                            <span className="text-[10px] text-slate-300 font-semibold">—</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Edit button */}
                    <td className="border-b border-slate-100 px-5 py-3.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); setEditTarget(staff); }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 opacity-0 group-hover:opacity-100 transition-all">
                        <Shield size={12} /> Edit Access
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>

            {/* Footer count */}
            {!loadingList && filtered.length > 0 && (
              <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-5 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-emerald-100 border border-emerald-300" /> Has Access</span>
                  <span className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-slate-100 border border-slate-200" /> No Access</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  {loadingPerms ? (
                    <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Loading access…</span>
                  ) : (
                    `Showing ${filtered.length} of ${staffList.length} staff`
                  )}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      <AnimatePresence>
        {editTarget && (
          <EditDrawer
            key={editTarget.staffId}
            staff={editTarget}
            menuSections={menuSections}
            onClose={handleEditClose}
            onSaved={handleEditSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
