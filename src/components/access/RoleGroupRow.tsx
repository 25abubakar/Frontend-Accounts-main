/**
 * src/components/access/RoleGroupRow.tsx
 *
 * Renders one role-group header row + all individual staff rows inside
 * the department permission matrix table.
 *
 * Features:
 *  - Expand / collapse individual rows
 *  - Role-level master toggle (grant/revoke for all in role)
 *  - Individual cell toggle with override highlighting (amber)
 *  - Dirty-state ring (sky blue) for unsaved changes
 *  - Source badge column showing where permission comes from
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown, ChevronRight, Check, CheckSquare, Square, ExternalLink,
} from "lucide-react";
import type { FeatureDto } from "../../api/accessApi";
import { type RoleGroup, type PermMap, rowKey, roleMajority } from "./accessHelpers";

// ── Source badge ──────────────────────────────────────────────────────────
type PermSource = "UserOverride" | "RoleDefault" | "Matrix" | "Denied" | "Group" | "Both" | "Individual" | "None";

function SourceBadge({ source }: { source?: PermSource | string }) {
  if (!source) return null;
  const map: Record<string, { label: string; cls: string }> = {
    UserOverride: { label: "👤 Individual", cls: "bg-amber-100 text-amber-700" },
    Individual:   { label: "👤 Individual", cls: "bg-amber-100 text-amber-700" },
    RoleDefault:  { label: "👔 Role",       cls: "bg-blue-100 text-blue-700"   },
    Matrix:       { label: "📊 Matrix",     cls: "bg-indigo-100 text-indigo-700" },
    Group:        { label: "🏷 Group",      cls: "bg-emerald-100 text-emerald-700" },
    Both:         { label: "✅ Both",       cls: "bg-green-100 text-green-700"  },
    Denied:       { label: "🚫 Denied",     cls: "bg-red-100 text-red-600"      },
    None:         { label: "—",             cls: "bg-slate-100 text-slate-400"  },
  };
  const cfg = map[source] ?? { label: source, cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

interface RoleGroupRowProps {
  group: RoleGroup;
  features: FeatureDto[];
  modules: string[];
  grouped: Record<string, FeatureDto[]>;
  localPerms: PermMap;
  originalPerms: PermMap;
  /** Optional source map: staffId → featureKey → source string */
  sourceMap?: Record<string, Record<string, string>>;
  showSource?: boolean;
  onToggleCell:  (key: string, fk: string) => void;
  onRoleToggle:  (jobTitle: string, fk: string, value: boolean) => void;
  onSelectAllRow: (key: string) => void;
  onClearRow:    (key: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function RoleGroupRow({
  group, features, modules, grouped,
  localPerms, originalPerms,
  sourceMap, showSource = false,
  onToggleCell, onRoleToggle, onSelectAllRow, onClearRow,
}: RoleGroupRowProps) {
  const navigate   = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const hiredRows  = group.rows.filter(r => r.staffId);

  // Role-level majority for each feature
  const roleMaj = useMemo(
    () => Object.fromEntries(features.map(f => [f.featureKey, roleMajority(group.rows, f.featureKey)])),
    [group.rows, features]
  );

  // Pending changes count for this group
  const pendingCount = useMemo(() => {
    let count = 0;
    for (const r of group.rows) {
      const key = rowKey(r);
      for (const f of features) {
        const cur  = localPerms[key]?.[f.featureKey]    ?? false;
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
        {/* Expand / collapse + role name */}
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
            const someTrue = hiredRows.some(r => localPerms[rowKey(r)]?.[f.featureKey] ?? false);
            const allTrue  = hiredRows.length > 0 && hiredRows.every(r => localPerms[rowKey(r)]?.[f.featureKey] ?? false);
            const maj      = roleMaj[f.featureKey];
            const allMatch = hiredRows.every(r => (localPerms[rowKey(r)]?.[f.featureKey] ?? false) === maj);

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

        {/* Source column header (role level) */}
        {showSource && (
          <td className="border-b border-l border-slate-200 px-3 py-2.5 text-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Source</span>
          </td>
        )}

        {/* Row actions placeholder */}
        <td className="border-b border-l border-slate-200 px-3 py-2.5 text-center">
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Role</span>
        </td>
      </tr>

      {/* ── Individual staff rows ── */}
      <AnimatePresence initial={false}>
        {expanded && group.rows.map((row, idx) => {
          const key     = rowKey(row);
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
                  const checked    = localPerms[key]?.[f.featureKey]    ?? false;
                  const original   = originalPerms[key]?.[f.featureKey] ?? false;
                  const roleDef    = roleMaj[f.featureKey];
                  const isOverride = isHired && checked !== roleDef;
                  const isDirty    = checked !== original;

                  return (
                    <td key={f.featureKey} className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
                      <button
                        onClick={() => isHired && onToggleCell(key, f.featureKey)}
                        disabled={!isHired}
                        title={
                          !isHired        ? "Person must be hired first"
                          : isOverride    ? `Override: differs from ${group.jobTitle} default`
                          : `${checked ? "Revoke" : "Grant"} ${f.featureName}`
                        }
                        className={`h-5 w-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                          !isHired
                            ? "border-slate-100 bg-slate-50 cursor-not-allowed"
                            : checked
                            ? isOverride
                              ? "bg-amber-400 border-amber-400 text-white"
                              : "bg-indigo-500 border-indigo-500 text-white"
                            : isOverride
                            ? "border-amber-300 bg-amber-50 hover:border-amber-400"
                            : "border-slate-200 bg-white hover:border-indigo-400"
                        } ${isDirty ? "ring-2 ring-offset-1 ring-sky-400" : ""}`}
                      >
                        {checked && isHired && <Check size={10} strokeWidth={3} />}
                      </button>
                    </td>
                  );
                })
              )}

              {/* Source column */}
              {showSource && (
                <td className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
                  {isHired && row.staffId ? (
                    <SourceBadge source={sourceMap?.[row.staffId]?.[features[0]?.featureKey] as PermSource} />
                  ) : (
                    <span className="text-slate-200 text-xs">—</span>
                  )}
                </td>
              )}

              {/* Row actions */}
              <td className="border-b border-l border-slate-100 px-2 py-2.5 text-center">
                {isHired ? (
                  <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onSelectAllRow(key)}
                      title="Grant all"
                      className="rounded p-1 text-emerald-500 hover:bg-emerald-50 transition-colors"
                    >
                      <CheckSquare size={12} />
                    </button>
                    <button
                      onClick={() => onClearRow(key)}
                      title="Revoke all"
                      className="rounded p-1 text-red-400 hover:bg-red-50 transition-colors"
                    >
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
