/**
 * src/components/access/MatrixTable.tsx
 *
 * Renders the full permission matrix table with role groups.
 * Pure presentational — all data and callbacks come from props.
 */
import { Loader2, Users, Shield } from "lucide-react";
import type { FeatureDto } from "../../api/accessApi";
import { type RoleGroup, type PermMap } from "./accessHelpers";
import RoleGroupRow from "./RoleGroupRow";

interface MatrixTableProps {
  loading: boolean;
  roleGroups: RoleGroup[];
  features: FeatureDto[];
  visibleFeatures: FeatureDto[];
  visibleModules: string[];
  visibleGrouped: Record<string, FeatureDto[]>;
  localPerms: PermMap;
  originalPerms: PermMap;
  sourceMap?: Record<string, Record<string, string>>;
  showSource?: boolean;
  onToggleCell: (key: string, fk: string) => void;
  onRoleToggle: (jobTitle: string, fk: string, value: boolean) => void;
  onSelectAllRow: (key: string) => void;
  onClearRow: (key: string) => void;
}

export default function MatrixTable({
  loading, roleGroups, features, visibleFeatures, visibleModules, visibleGrouped,
  localPerms, originalPerms, sourceMap, showSource = false,
  onToggleCell, onRoleToggle, onSelectAllRow, onClearRow,
}: MatrixTableProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (roleGroups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
        <Users size={40} className="text-slate-200" strokeWidth={1.5} />
        <p className="text-sm font-bold text-slate-500">No persons found in this branch</p>
        <p className="text-xs text-slate-400">Select a different branch or register persons first</p>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
        <Shield size={40} className="text-slate-200" strokeWidth={1.5} />
        <p className="text-sm font-bold text-slate-500">No features defined</p>
        <p className="text-xs text-slate-400">Add features via the backend first</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full border-separate border-spacing-0 text-sm">
        {/* Header */}
        <thead className="sticky top-0 z-20 bg-slate-50/95 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-4 py-3 text-left min-w-[220px]">Staff / Person</th>
            {visibleModules.map(mod =>
              visibleGrouped[mod].map(f => (
                <th key={f.featureKey} className="border-b border-l border-slate-200 px-2 py-3 text-center min-w-[60px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] text-indigo-500 font-black">{mod}</span>
                    <span className="text-[10px] text-slate-700 font-bold truncate max-w-[50px]" title={f.featureName}>
                      {f.featureName.split("›").pop()?.trim() || f.featureKey}
                    </span>
                  </div>
                </th>
              ))
            )}
            {showSource && (
              <th className="border-b border-l border-slate-200 px-3 py-3 text-center">Source</th>
            )}
            <th className="border-b border-l border-slate-200 px-3 py-3 text-center">Actions</th>
          </tr>
        </thead>

        {/* Body — role groups */}
        <tbody>
          {roleGroups.map(group => (
            <RoleGroupRow
              key={group.jobTitle}
              group={group}
              features={visibleFeatures}
              modules={visibleModules}
              grouped={visibleGrouped}
              localPerms={localPerms}
              originalPerms={originalPerms}
              sourceMap={sourceMap}
              showSource={showSource}
              onToggleCell={onToggleCell}
              onRoleToggle={onRoleToggle}
              onSelectAllRow={onSelectAllRow}
              onClearRow={onClearRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
