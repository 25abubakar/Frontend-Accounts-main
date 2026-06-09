/**
 * AdminAccessPage — Simplified 3-Step Access Manager
 *
 * Step 1 → Select users
 * Step 2 → Choose menus (grant access) + set CRUD permissions per selected menu
 * Step 3 → Review & Save
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Check, X, Loader2, Users, Shield, Save,
  ChevronRight, ChevronDown, AlertCircle, RefreshCw,
  CheckSquare, Square, LayoutGrid, Zap,
  Eye, Plus, Pencil, Trash2, LayoutList,
} from "lucide-react";
import { accessApi } from "../../api/accessApi";
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

// ── Types ─────────────────────────────────────────────────────────────────
type PermState = Record<string, boolean>;

// CRUD action definitions
const CRUD = [
  { key: "VIEW",   label: "View",   icon: Eye,    color: "text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100" },
  { key: "ADD",    label: "Add",    icon: Plus,   color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { key: "EDIT",   label: "Edit",   icon: Pencil, color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { key: "DELETE", label: "Delete", icon: Trash2, color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100" },
] as const;

type CrudKey = "VIEW" | "ADD" | "EDIT" | "DELETE";

interface MenuSection {
  id: number;
  title: string;
  icon?: string | null;
  route?: string | null;
  featureKey: string;       // MENU_{id}
  children: MenuSection[];
}

// Build CRUD feature key: e.g. menuTitle="HR" action="VIEW" → "HR_VIEW"
// We derive CRUD keys from the menu title so they can be stored as features.
// Convention: MENU_{id}_{ACTION}
function crudKey(menuId: number, action: CrudKey): string {
  return `MENU_${menuId}_${action}`;
}

// ── Build menu tree from API ───────────────────────────────────────────────
function buildMenuSections(items: ApiMenuItem[]): MenuSection[] {
  return items.map(item => ({
    id: item.id,
    title: item.title,
    icon: item.icon,
    route: item.route,
    featureKey: `MENU_${item.id}`,
    children: item.children ? buildMenuSections(item.children) : [],
  }));
}

// ── Flatten tree to get all sections (incl. children) ─────────────────────
function flattenSections(sections: MenuSection[]): MenuSection[] {
  const out: MenuSection[] = [];
  for (const s of sections) {
    out.push(s);
    if (s.children.length) out.push(...flattenSections(s.children));
  }
  return out;
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

// ── Step badge ────────────────────────────────────────────────────────────
function StepBadge({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? "opacity-100" : done ? "opacity-70" : "opacity-40"}`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black shrink-0 transition-all ${
        done   ? "bg-emerald-500 text-white" :
        active ? "bg-indigo-600 text-white" :
                 "bg-slate-200 text-slate-500"
      }`}>
        {done ? <Check size={12} strokeWidth={3} /> : n}
      </div>
      <span className={`text-sm font-bold hidden sm:block ${active ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STEP 1 — User Picker
// ══════════════════════════════════════════════════════════════════════════
function RoleGroup({ role, members, selected, onToggle }: {
  role: string; members: StaffDto[];
  selected: Set<string>; onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const allSel  = members.every(m => selected.has(m.staffId));
  const someSel = members.some(m => selected.has(m.staffId));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
        {/* Role checkbox */}
        <div
          className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            allSel ? "bg-indigo-500 border-indigo-500" :
            someSel ? "bg-indigo-200 border-indigo-400" :
            "border-slate-300 bg-white"
          }`}
          onClick={e => { e.stopPropagation(); members.forEach(m => onToggle(m.staffId)); }}
        >
          {allSel && <Check size={9} strokeWidth={3} className="text-white" />}
          {someSel && !allSel && <div className="h-1.5 w-1.5 rounded-sm bg-indigo-500" />}
        </div>
        <span className="flex-1 text-left text-xs font-black uppercase tracking-wider text-slate-600">{role}</span>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">{members.length}</span>
        {open ? <ChevronDown size={13} className="text-slate-400" /> : <ChevronRight size={13} className="text-slate-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.15 }} className="overflow-hidden">
            <div className="grid sm:grid-cols-2 gap-1 px-3 pb-3">
              {members.map(s => {
                const isSel = selected.has(s.staffId);
                return (
                  <button key={s.staffId} onClick={() => onToggle(s.staffId)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all border ${
                      isSel ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-slate-50 border-transparent hover:border-slate-200"
                    }`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGrad(s.fullName)} text-xs font-black text-white`}>
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${isSel ? "text-indigo-700" : "text-slate-700"}`}>{s.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.loginId}</p>
                    </div>
                    {isSel && <Check size={14} className="shrink-0 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserPicker({ staff, selected, onToggle, onNext }: {
  staff: StaffDto[]; selected: Set<string>;
  onToggle: (id: string) => void; onNext: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return staff.filter(s =>
      !lq || s.fullName.toLowerCase().includes(lq) ||
      (s.loginId ?? "").toLowerCase().includes(lq) ||
      s.jobTitle.toLowerCase().includes(lq) ||
      (s.department ?? "").toLowerCase().includes(lq)
    );
  }, [staff, q]);

  const byRole = useMemo(() => {
    const map = new Map<string, StaffDto[]>();
    for (const s of filtered) {
      const role = s.jobTitle || "Unassigned";
      if (!map.has(role)) map.set(role, []);
      map.get(role)!.push(s);
    }
    return map;
  }, [filtered]);

  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.staffId));

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name, login ID, job title…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none" />
          {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={12} /></button>}
        </div>
        <button
          onClick={() => filtered.forEach(s => allSelected ? (selected.has(s.staffId) && onToggle(s.staffId)) : onToggle(s.staffId))}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
          {allSelected ? <Square size={12} /> : <CheckSquare size={12} />}
          {allSelected ? "Clear All" : "Select All"}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users size={36} className="text-slate-200" />
            <p className="text-sm text-slate-400">No staff found</p>
          </div>
        ) : Array.from(byRole.entries()).map(([role, members]) => (
          <RoleGroup key={role} role={role} members={members} selected={selected} onToggle={onToggle} />
        ))}
      </div>

      <div className="shrink-0 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-500">{selected.size} user{selected.size !== 1 ? "s" : ""} selected</span>
        <button onClick={onNext} disabled={selected.size === 0}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40">
          Next: Choose Access <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STEP 2 — Choose Access
// Layout:
//   LEFT PANEL  — Menu tree (check to grant access to menu)
//   RIGHT PANEL — Selected menus with CRUD toggles per menu item
// ══════════════════════════════════════════════════════════════════════════

// ── Single menu row in the left tree ─────────────────────────────────────
function MenuTreeRow({ section, depth, perms, onToggle }: {
  section: MenuSection; depth: number;
  perms: PermState; onToggle: (key: string, val: boolean) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const granted     = perms[section.featureKey] ?? false;
  const hasChildren = section.children.length > 0;
  const childGrantedCount = section.children.filter(c => perms[c.featureKey] ?? false).length;
  const partiallyGranted  = hasChildren && childGrantedCount > 0 && childGrantedCount < section.children.length;
  const allChildrenGranted = hasChildren && section.children.length > 0 && section.children.every(c => perms[c.featureKey] ?? false);
  const visualGranted = granted || allChildrenGranted;

  const handleCheck = () => {
    const newVal = !granted;
    onToggle(section.featureKey, newVal);
    if (hasChildren) section.children.forEach(c => onToggle(c.featureKey, newVal));
  };

  return (
    <div>
      <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition-colors ${
        depth > 0 ? "ml-5 pl-3 border-l-2 border-slate-100" : ""
      }`}>
        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)} className="shrink-0 w-4 text-slate-400 hover:text-slate-600">
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : <div className="w-4 shrink-0" />}

        <button onClick={handleCheck}
          className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            visualGranted ? "bg-indigo-500 border-indigo-500 text-white" :
            partiallyGranted ? "bg-indigo-200 border-indigo-400" :
            "border-slate-300 bg-white hover:border-indigo-400"
          }`}>
          {visualGranted && <Check size={10} strokeWidth={3} />}
          {partiallyGranted && <div className="h-1.5 w-1.5 rounded-sm bg-indigo-500" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 truncate">{section.title}</p>
          {section.route && <p className="text-[10px] font-mono text-slate-400 truncate">{section.route}</p>}
        </div>

        {granted && (
          <span className="shrink-0 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">ON</span>
        )}
      </div>

      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.15 }} className="overflow-hidden">
            {section.children.map(child => (
              <MenuTreeRow key={child.id} section={child} depth={depth + 1} perms={perms} onToggle={onToggle} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CRUD permissions panel for a selected menu item ───────────────────────
function MenuCrudRow({ section, perms, onToggle }: {
  section: MenuSection;
  perms: PermState;
  onToggle: (key: string, val: boolean) => void;
}) {
  const menuGranted = perms[section.featureKey] ?? false;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      menuGranted ? "border-indigo-100 bg-white shadow-sm" : "border-slate-100 bg-slate-50/50 opacity-60"
    }`}>
      {/* Menu header row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white ${
          menuGranted ? "bg-gradient-to-br from-indigo-500 to-violet-500" : "bg-slate-300"
        }`}>
          {section.title.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800 truncate">{section.title}</p>
          {section.route && <p className="text-[10px] font-mono text-slate-400 truncate">{section.route}</p>}
        </div>
        {!menuGranted && (
          <span className="shrink-0 text-[10px] font-bold text-slate-400 bg-slate-200 rounded-full px-2 py-0.5">No access</span>
        )}
      </div>

      {/* CRUD toggles */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Permissions</p>
        <div className="flex flex-wrap gap-2">
          {CRUD.map(({ key, label, icon: Icon, color }) => {
            const fk      = crudKey(section.id, key as CrudKey);
            const active  = perms[fk] ?? false;
            const disabled = !menuGranted;
            return (
              <button key={key}
                onClick={() => !disabled && onToggle(fk, !active)}
                disabled={disabled}
                title={disabled ? "Grant menu access first" : `${active ? "Revoke" : "Grant"} ${label}`}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                  active ? color.replace("hover:", "") + " shadow-sm ring-1 ring-inset ring-current/20" : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                }`}>
                <Icon size={12} strokeWidth={2.5} />
                {label}
                {active && <Check size={10} strokeWidth={3} className="ml-0.5" />}
              </button>
            );
          })}
          {/* Grant All shortcut */}
          {menuGranted && (
            <button
              onClick={() => CRUD.forEach(({ key }) => onToggle(crudKey(section.id, key as CrudKey), true))}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
              <CheckSquare size={11} /> All
            </button>
          )}
          {menuGranted && (
            <button
              onClick={() => CRUD.forEach(({ key }) => onToggle(crudKey(section.id, key as CrudKey), false))}
              className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:border-red-300 hover:text-red-500 transition-all">
              <Square size={11} /> None
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 2 main component ────────────────────────────────────────────────
function AccessPicker({ menuSections, perms, onToggle, onBack, onNext }: {
  menuSections: MenuSection[];
  perms: PermState;
  onToggle: (key: string, val: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  // Collect all granted sections (incl. children) for the right panel
  const allSections  = useMemo(() => flattenSections(menuSections), [menuSections]);
  const grantedSections = useMemo(
    () => allSections.filter(s => perms[s.featureKey] ?? false),
    [allSections, perms]
  );

  const grantCount = grantedSections.length;

  return (
    <div className="flex flex-col h-full">
      {/* Two-column layout */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5 overflow-hidden">

        {/* ── LEFT: Menu tree ── */}
        <div className="lg:w-80 shrink-0 flex flex-col min-h-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
            <LayoutGrid size={14} className="text-indigo-500" />
            <span className="text-sm font-black text-slate-700">Menu Sections</span>
            {grantCount > 0 && (
              <span className="ml-auto rounded-full bg-indigo-100 text-indigo-600 px-2 py-0.5 text-[10px] font-black">{grantCount} selected</span>
            )}
          </div>
          {/* Grant all / Revoke all */}
          <div className="shrink-0 px-3 py-2 border-b border-slate-50 flex gap-2">
            <button
              onClick={() => allSections.forEach(s => onToggle(s.featureKey, true))}
              className="flex-1 text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 hover:bg-emerald-100 transition-colors">
              Grant All
            </button>
            <button
              onClick={() => { allSections.forEach(s => onToggle(s.featureKey, false)); CRUD.forEach(c => allSections.forEach(s => onToggle(crudKey(s.id, c.key as CrudKey), false))); }}
              className="flex-1 text-[10px] font-black text-red-500 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-100 transition-colors">
              Revoke All
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
            {menuSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <LayoutGrid size={28} className="text-slate-200" />
                <p className="text-xs text-slate-400">No menu sections</p>
              </div>
            ) : menuSections.map(section => (
              <MenuTreeRow key={section.id} section={section} depth={0} perms={perms} onToggle={onToggle} />
            ))}
          </div>
        </div>

        {/* ── RIGHT: CRUD permissions for selected menus ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 mb-3 flex items-center gap-2">
            <LayoutList size={14} className="text-indigo-500" />
            <span className="text-sm font-black text-slate-700">
              {grantCount === 0
                ? "Select menus on the left to set permissions"
                : `Set permissions for ${grantCount} selected menu${grantCount !== 1 ? "s" : ""}`}
            </span>
            {grantCount > 0 && (
              <div className="ml-auto flex gap-1.5">
                <button
                  onClick={() => grantedSections.forEach(s => CRUD.forEach(c => onToggle(crudKey(s.id, c.key as CrudKey), true)))}
                  className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100">
                  All Permissions
                </button>
                <button
                  onClick={() => grantedSections.forEach(s => CRUD.forEach(c => onToggle(crudKey(s.id, c.key as CrudKey), false)))}
                  className="text-[10px] font-black text-red-500 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-100">
                  Clear All
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {grantCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 p-8">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Shield size={24} className="text-indigo-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-600">No menus selected yet</p>
                  <p className="text-xs text-slate-400 mt-1">Check menu sections on the left — then set View, Add, Edit, Delete permissions here.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {CRUD.map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold ${color}`}>
                      <Icon size={11} /> {label}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              grantedSections.map(section => (
                <MenuCrudRow key={section.id} section={section} perms={perms} onToggle={onToggle} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          ← Back
        </button>
        <button onClick={onNext}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700">
          Next: Review & Save <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// STEP 3 — Review & Save
// ══════════════════════════════════════════════════════════════════════════
function ReviewStep({
  selectedStaff, perms, menuSections, saving, onBack, onSave, error,
}: {
  selectedStaff: StaffDto[];
  perms: PermState;
  menuSections: MenuSection[];
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  error: string | null;
}) {
  const allSections = useMemo(() => flattenSections(menuSections), [menuSections]);

  // Get granted menus
  const grantedMenus = allSections.filter(s => perms[s.featureKey] ?? false);

  // Count CRUD permissions per action
  const crudCounts = useMemo(() => {
    const counts = { VIEW: 0, ADD: 0, EDIT: 0, DELETE: 0 } as Record<CrudKey, number>;
    for (const c of CRUD) {
      counts[c.key] = grantedMenus.reduce((n, s) => n + (perms[crudKey(s.id, c.key as CrudKey)] ? 1 : 0), 0);
    }
    return counts;
  }, [grantedMenus, perms]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* Users */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Users size={15} className="text-indigo-500" />
            <span className="text-sm font-black text-slate-700">
              {selectedStaff.length} user{selectedStaff.length !== 1 ? "s" : ""} will be updated
            </span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {selectedStaff.map(s => (
              <div key={s.staffId} className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1">
                <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${avatarGrad(s.fullName)} flex items-center justify-center text-[9px] font-black text-white shrink-0`}>
                  {s.fullName.charAt(0)}
                </div>
                <span className="text-xs font-bold text-indigo-700">{s.fullName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Access Summary */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <LayoutGrid size={15} className="text-sky-500" />
            <span className="text-sm font-black text-slate-700">
              {grantedMenus.length} menu section{grantedMenus.length !== 1 ? "s" : ""} granted
            </span>
          </div>
          <div className="p-3 flex flex-wrap gap-1.5">
            {grantedMenus.length === 0 ? (
              <p className="text-xs text-slate-400 px-1">No menu access granted</p>
            ) : grantedMenus.map(m => (
              <span key={m.id} className="text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 rounded-lg px-2 py-1">
                {m.title}
              </span>
            ))}
          </div>
        </div>

        {/* CRUD Permissions Summary */}
        <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-2">
            <Shield size={15} className="text-indigo-500" />
            <span className="text-sm font-black text-slate-700">Permission Breakdown</span>
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CRUD.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${CRUD.find(c => c.key === key)?.color.split(" ")[1].replace("bg-", "bg-")}`}>
                  <Icon size={13} className={CRUD.find(c => c.key === key)?.color.split(" ")[0]} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500">{label}</p>
                  <p className="text-sm font-bold text-slate-800">{crudCounts[key as CrudKey]} granted</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button onClick={onBack} disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          ← Back
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : `Save Access for ${selectedStaff.length} User${selectedStaff.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════
export default function AdminAccessPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Data
  const [staff,        setStaff]       = useState<StaffDto[]>([]);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);

  // User selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Permission state (what admin is configuring)
  const [perms, setPerms] = useState<PermState>({});

  // UI state
  const [loadingData,  setLoadingData]  = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saveSuccess,  setSaveSuccess]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Load staff + menus ───────────────────────────────────────────────────
  const loadInitial = useCallback(async () => {
    try {
      setLoadingData(true);
      const [staffRes, menuRes] = await Promise.all([
        staffApi.getAll(),
        menuApi.getSidebarTree().catch(() => [] as ApiMenuItem[]),
      ]);
      setStaff(toArr<StaffDto>(staffRes));
      setMenuSections(buildMenuSections(toArr<ApiMenuItem>(menuRes)));
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // ── One-time: remove stale sidebar entries that point to deleted pages ──
  useEffect(() => {
    const STALE_ROUTES = [
      "/access/groups",
      "/access/groups/new",
      "/access/groups/matrix",
      "/access/dept",
      "/access/department",
      "/access/matrix",
      "/rbac/staff",
    ];
    const cleanupStaleMenus = async () => {
      try {
        const all = await menuApi.getAll();
        const stale = toArr<ApiMenuItem>(all).filter(item =>
          item.route && STALE_ROUTES.some(r => item.route!.startsWith(r))
        );
        for (const item of stale) {
          try { await menuApi.deleteMenu(item.id); } catch { /* skip if already gone */ }
        }
        if (stale.length > 0) {
          window.dispatchEvent(new Event("navigation-updated"));
        }
      } catch { /* silent — don't break the page if cleanup fails */ }
    };
    cleanupStaleMenus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount
  const handleGoToStep2 = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setLoadingPerms(true);
      setError(null);
      const ep = await rbacApi.getEffectivePermissions(ids[0]).catch(() => []);
      const state: PermState = {};
      for (const p of ep) state[p.featureKey] = p.hasAccess;
      setPerms(state);
    } catch {
      // Start with empty (all false)
      setPerms({});
    } finally {
      setLoadingPerms(false);
      setStep(2);
    }
  }, [selectedIds]);

  // ── Toggle permission ────────────────────────────────────────────────────
  const handleToggle = useCallback((key: string, val: boolean) => {
    setPerms(p => ({ ...p, [key]: val }));
  }, []);

  // ── Save for all selected users ──────────────────────────────────────────
  const handleSave = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setSaving(true); setError(null);
      const changed = Object.keys(perms).filter(k => perms[k] !== false); // Only grant, no need to save false if not previously true
      if (changed.length === 0) { setSaving(false); return; }

      const results = await Promise.allSettled(
        ids.map(staffId =>
          saveBooleanPermissionChanges(staffId, changed.map(featureKey => ({
            featureKey,
            granted: perms[featureKey],
            previousGranted: false,
            source: undefined,
          })))
        )
      );

      const failed = results.filter(r => r.status === "rejected").length;
      if (failed > 0) {
        setError(`Saved for ${ids.length - failed} users, failed for ${failed}.`);
      } else {
        setSaveSuccess(true);
        window.dispatchEvent(new CustomEvent("navigation-updated"));
        setTimeout(() => { setSaveSuccess(false); setStep(1); setSelectedIds(new Set()); setPerms({}); }, 2000);
      }
    } catch (err) {
      setError(getApiErrorMessage(err) || "Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  const selectedStaff = useMemo(() => staff.filter(s => selectedIds.has(s.staffId)), [staff, selectedIds]);
  const toggleUser = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
              <Shield size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Grant User Access</h1>
              <p className="text-xs text-slate-400">Select users → choose menus + set permissions → save</p>
            </div>
          </div>
          <button onClick={loadInitial} disabled={loadingData}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={12} className={loadingData ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        <div className="flex items-center gap-2">
          <StepBadge n={1} label="Select Users" active={step === 1} done={step > 1} />
          <div className="flex-1 h-px bg-slate-200 max-w-[40px]" />
          <StepBadge n={2} label="Choose Access" active={step === 2} done={step > 2} />
          <div className="flex-1 h-px bg-slate-200 max-w-[40px]" />
          <StepBadge n={3} label="Review & Save" active={step === 3} done={false} />
        </div>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="shrink-0 mx-5 lg:mx-8 mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700">
            <Zap size={14} /> Access updated successfully! Sidebar refreshes automatically.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-5">
        {loadingData ? (
          <div className="flex h-full items-center justify-center gap-3 flex-col">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading staff and menus…</p>
          </div>
        ) : saveSuccess ? (
          <div className="flex h-full items-center justify-center flex-col gap-4">
            <div className="h-16 w-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Check size={32} className="text-emerald-500" strokeWidth={3} />
            </div>
            <p className="text-lg font-black text-slate-700">Access Saved!</p>
            <p className="text-sm text-slate-400">Redirecting back to step 1…</p>
          </div>
        ) : (
          <div className="h-full">
            {step === 1 && (
              <UserPicker staff={staff} selected={selectedIds} onToggle={toggleUser} onNext={handleGoToStep2} />
            )}
            {step === 2 && (
              loadingPerms ? (
                <div className="flex h-full items-center justify-center gap-3 flex-col">
                  <Loader2 size={32} className="animate-spin text-indigo-400" />
                  <p className="text-sm text-slate-400">Loading current permissions…</p>
                </div>
              ) : (
                <AccessPicker
                  menuSections={menuSections}
                  perms={perms}
                  onToggle={handleToggle}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                />
              )
            )}
            {step === 3 && (
              <ReviewStep
                selectedStaff={selectedStaff}
                perms={perms}
                menuSections={menuSections}
                saving={saving}
                onBack={() => setStep(2)}
                onSave={handleSave}
                error={error}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
