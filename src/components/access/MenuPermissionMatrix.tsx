/**
 * MenuPermissionMatrix.tsx
 *
 * Professional two-level permission matrix:
 *   Level 1 — Menu Access  (has access: yes/no)
 *   Level 2 — CRUD Actions (Create / Read / Update / Delete) per menu
 *
 * Columns = Menu items (grouped by parent)
 * Rows    = Staff members (grouped by job title / role)
 */
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, Check, X, Loader2, Users, Shield,
  Eye, Plus, Pencil, Trash2, ChevronDown,
} from "lucide-react";
import type { FeatureDto } from "../../api/accessApi";
import type { MatrixStaffRow } from "../../api/accessApi";

// ── Types ─────────────────────────────────────────────────────────────────

export interface MenuNode {
  menuId: number;
  title: string;
  featureKey: string;          // MENU_{id}
  crudKeys: {
    create?: string;           // e.g. ACCOUNTS_CREATE
    read?:   string;           // e.g. ACCOUNTS_VIEW
    update?: string;           // e.g. ACCOUNTS_EDIT
    delete?: string;           // e.g. ACCOUNTS_DELETE
  };
  children: MenuNode[];
}

export type PermMap = Record<string, Record<string, boolean>>;

interface MenuPermissionMatrixProps {
  loading:       boolean;
  staff:         MatrixStaffRow[];
  menuNodes:     MenuNode[];          // tree of menus with CRUD keys
  allFeatures:   FeatureDto[];
  localPerms:    PermMap;
  originalPerms: PermMap;
  onToggle:      (staffKey: string, featureKey: string, value: boolean) => void;
  onSave:        () => void;
  onReset:       () => void;
  saving:        boolean;
  pendingCount:  number;
}

// ── CRUD action config ────────────────────────────────────────────────────

const CRUD_ACTIONS = [
  { key: "create", label: "Create", icon: Plus,   color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { key: "read",   label: "Read",   icon: Eye,    color: "text-sky-600    bg-sky-50    border-sky-200"    },
  { key: "update", label: "Update", icon: Pencil, color: "text-amber-600  bg-amber-50  border-amber-200"  },
  { key: "delete", label: "Delete", icon: Trash2, color: "text-red-600    bg-red-50    border-red-200"    },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────

function staffKey(r: MatrixStaffRow): string {
  return r.staffId ?? r.personId;
}

function groupByRole(staff: MatrixStaffRow[]): Map<string, MatrixStaffRow[]> {
  const map = new Map<string, MatrixStaffRow[]>();
  for (const r of staff) {
    const title = r.jobTitle ?? "Unassigned";
    if (!map.has(title)) map.set(title, []);
    map.get(title)!.push(r);
  }
  return map;
}

// ── Checkbox cell ─────────────────────────────────────────────────────────

function Cell({
  checked, dirty, disabled = false,
  onClick, title,
}: {
  checked: boolean; dirty: boolean; disabled?: boolean;
  onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        h-6 w-6 rounded-md border-2 flex items-center justify-center mx-auto
        transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed
        ${checked
          ? "bg-indigo-500 border-indigo-500 text-white"
          : "border-slate-200 bg-white hover:border-indigo-400"}
        ${dirty ? "ring-2 ring-offset-1 ring-sky-400" : ""}
      `}
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function MenuPermissionMatrix({
  loading, staff, menuNodes, localPerms, originalPerms,
  onToggle, onSave, onReset, saving, pendingCount,
}: MenuPermissionMatrixProps) {

  // Which menu columns are expanded to show CRUD
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());
  // Which role groups are collapsed
  const [collapsedRoles, setCollapsedRoles] = useState<Set<string>>(new Set());

  const roleGroups = useMemo(() => groupByRole(staff), [staff]);

  const toggleMenuExpand = useCallback((menuId: number) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      next.has(menuId) ? next.delete(menuId) : next.add(menuId);
      return next;
    });
  }, []);

  const toggleRole = useCallback((role: string) => {
    setCollapsedRoles(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  }, []);

  // Flatten menu nodes for column rendering (only top-level for now)
  const topMenus = useMemo(() => menuNodes.filter(m => m.menuId > 0), [menuNodes]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
        <Users size={40} className="text-slate-200" strokeWidth={1.5} />
        <p className="text-sm font-bold text-slate-500">No persons in this branch</p>
        <p className="text-xs text-slate-400">Register persons first</p>
      </div>
    );
  }

  if (topMenus.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
        <Shield size={40} className="text-slate-200" strokeWidth={1.5} />
        <p className="text-sm font-bold text-slate-500">No menu items found</p>
        <p className="text-xs text-slate-400">Seed menus from Settings first</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Save bar ── */}
      <div className="flex items-center justify-between px-1 pb-3 shrink-0">
        <p className="text-xs font-bold text-slate-400">
          {staff.length} person{staff.length !== 1 ? "s" : ""} ·{" "}
          {topMenus.length} menu{topMenus.length !== 1 ? "s" : ""}
          {pendingCount > 0 && (
            <span className="ml-2 text-sky-600">· {pendingCount} unsaved change{pendingCount !== 1 ? "s" : ""}</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            disabled={saving || pendingCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            Reset
          </button>
          <button
            onClick={onSave}
            disabled={saving || pendingCount === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-sm">

          {/* ── Column headers ── */}
          <thead className="sticky top-0 z-30 bg-white shadow-sm">
            {/* Row 1: Menu names */}
            <tr>
              <th
                rowSpan={2}
                className="border-b-2 border-r border-slate-200 px-4 py-3 text-left min-w-[220px] bg-slate-50 sticky left-0 z-40"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Staff / Person
                </span>
              </th>
              {topMenus.map(menu => {
                const isExpanded = expandedMenus.has(menu.menuId);
                const hasCrud = Object.values(menu.crudKeys).some(Boolean);
                const crudCount = Object.values(menu.crudKeys).filter(Boolean).length;
                return (
                  <th
                    key={menu.menuId}
                    colSpan={isExpanded && hasCrud ? crudCount + 1 : 1}
                    className="border-b border-l border-slate-200 px-2 py-2 text-center bg-white"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => hasCrud && toggleMenuExpand(menu.menuId)}
                        className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider transition-colors ${
                          hasCrud ? "text-indigo-600 hover:text-indigo-800 cursor-pointer" : "text-slate-600 cursor-default"
                        }`}
                        title={hasCrud ? "Click to expand CRUD actions" : menu.title}
                      >
                        {menu.title}
                        {hasCrud && (
                          <motion.span
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight size={10} />
                          </motion.span>
                        )}
                      </button>
                      {hasCrud && (
                        <span className="text-[8px] text-slate-400 font-semibold">
                          {isExpanded ? "collapse" : `+${crudCount} actions`}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>

            {/* Row 2: Sub-headers (Access + CRUD when expanded) */}
            <tr>
              {topMenus.map(menu => {
                const isExpanded = expandedMenus.has(menu.menuId);
                const hasCrud = Object.values(menu.crudKeys).some(Boolean);
                const activeCrud = CRUD_ACTIONS.filter(a => menu.crudKeys[a.key]);

                if (isExpanded && hasCrud) {
                  return (
                    <>
                      {/* Access column */}
                      <th
                        key={`${menu.menuId}-access`}
                        className="border-b-2 border-l border-slate-200 px-2 py-1.5 text-center min-w-[52px] bg-indigo-50"
                      >
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">
                          Access
                        </span>
                      </th>
                      {/* CRUD columns */}
                      {activeCrud.map(action => (
                        <th
                          key={`${menu.menuId}-${action.key}`}
                          className={`border-b-2 border-l border-slate-200 px-2 py-1.5 text-center min-w-[52px] ${action.color.split(" ")[1]}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <action.icon size={9} className={action.color.split(" ")[0]} />
                            <span className={`text-[9px] font-black uppercase tracking-wider ${action.color.split(" ")[0]}`}>
                              {action.label}
                            </span>
                          </div>
                        </th>
                      ))}
                    </>
                  );
                }

                return (
                  <th
                    key={`${menu.menuId}-access`}
                    className="border-b-2 border-l border-slate-200 px-2 py-1.5 text-center min-w-[52px] bg-slate-50"
                  >
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Access
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {Array.from(roleGroups.entries()).map(([role, members]) => {
              const isCollapsed = collapsedRoles.has(role);
              return (
                <>
                  {/* Role group header row */}
                  <tr key={`role-${role}`} className="bg-slate-50/80">
                    <td
                      colSpan={999}
                      className="border-b border-slate-100 px-4 py-2 sticky left-0 bg-slate-50/80"
                    >
                      <button
                        onClick={() => toggleRole(role)}
                        className="flex items-center gap-2 text-xs font-black text-slate-700 hover:text-indigo-600 transition-colors"
                      >
                        <motion.span
                          animate={{ rotate: isCollapsed ? -90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown size={13} />
                        </motion.span>
                        <span className="uppercase tracking-wider">{role}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black text-slate-600">
                          {members.length}
                        </span>
                      </button>
                    </td>
                  </tr>

                  {/* Staff rows */}
                  <AnimatePresence initial={false}>
                    {!isCollapsed && members.map((member, idx) => {
                      const key = staffKey(member);
                      const perms = localPerms[key] ?? {};
                      const origPerms = originalPerms[key] ?? {};

                      return (
                        <motion.tr
                          key={key}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className={`group/row transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          } hover:bg-indigo-50/20`}
                        >
                          {/* Staff info */}
                          <td className="border-b border-slate-100 px-4 py-2.5 sticky left-0 bg-inherit z-10 min-w-[220px]">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-[10px] font-black text-white">
                                {member.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                                  {member.fullName}
                                </p>
                                <p className="text-[9px] text-slate-400 font-semibold">
                                  {member.loginId}
                                  {!member.isHired && (
                                    <span className="ml-1 text-amber-500">(not hired)</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Permission cells per menu */}
                          {topMenus.map(menu => {
                            const isExpanded = expandedMenus.has(menu.menuId);
                            const hasCrud = Object.values(menu.crudKeys).some(Boolean);
                            const activeCrud = CRUD_ACTIONS.filter(a => menu.crudKeys[a.key]);

                            const menuChecked = perms[menu.featureKey] ?? false;
                            const menuDirty   = menuChecked !== (origPerms[menu.featureKey] ?? false);

                            if (isExpanded && hasCrud) {
                              return (
                                <>
                                  {/* Menu access cell */}
                                  <td
                                    key={`${key}-${menu.menuId}-access`}
                                    className="border-b border-l border-slate-100 px-2 py-2.5 text-center bg-indigo-50/30"
                                  >
                                    <Cell
                                      checked={menuChecked}
                                      dirty={menuDirty}
                                      onClick={() => onToggle(key, menu.featureKey, !menuChecked)}
                                      title={`${menuChecked ? "Revoke" : "Grant"} access to ${menu.title}`}
                                    />
                                  </td>
                                  {/* CRUD cells */}
                                  {activeCrud.map(action => {
                                    const crudKey = menu.crudKeys[action.key]!;
                                    const crudChecked = perms[crudKey] ?? false;
                                    const crudDirty   = crudChecked !== (origPerms[crudKey] ?? false);
                                    return (
                                      <td
                                        key={`${key}-${menu.menuId}-${action.key}`}
                                        className="border-b border-l border-slate-100 px-2 py-2.5 text-center"
                                      >
                                        <Cell
                                          checked={crudChecked}
                                          dirty={crudDirty}
                                          disabled={!menuChecked}
                                          onClick={() => onToggle(key, crudKey, !crudChecked)}
                                          title={`${crudChecked ? "Revoke" : "Grant"} ${action.label} on ${menu.title}`}
                                        />
                                      </td>
                                    );
                                  })}
                                </>
                              );
                            }

                            return (
                              <td
                                key={`${key}-${menu.menuId}-access`}
                                className="border-b border-l border-slate-100 px-2 py-2.5 text-center"
                              >
                                <Cell
                                  checked={menuChecked}
                                  dirty={menuDirty}
                                  onClick={() => onToggle(key, menu.featureKey, !menuChecked)}
                                  title={`${menuChecked ? "Revoke" : "Grant"} access to ${menu.title}`}
                                />
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </>
              );
            })}
          </tbody>
        </table>

        {/* Legend */}
        <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 backdrop-blur-sm px-5 py-2 flex items-center gap-6 text-[10px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center">
              <Check size={8} strokeWidth={3} className="text-white" />
            </div>
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
          <span className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rounded border-2 border-slate-200 bg-white opacity-30" />
            Disabled (no menu access)
          </span>
          <span className="ml-auto text-slate-300">
            Click menu name to expand CRUD actions
          </span>
        </div>
      </div>
    </div>
  );
}
