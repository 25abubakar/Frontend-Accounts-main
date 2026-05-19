/**
 * src/components/access/MatrixToolbar.tsx
 *
 * Top toolbar for the Department Permission Matrix page.
 * Contains: department selector, select/clear all, module filter tabs,
 * reset button, save button, and stats.
 */
import { Loader2, Save, RotateCcw, CheckSquare, Square, ChevronDown, Shield } from "lucide-react";
import type { OrgNode } from "../../types";

interface MatrixToolbarProps {
  // Title
  deptName: string;

  // Department selector
  departments: OrgNode[];
  selectedDept: string;
  onDeptChange: (id: string) => void;

  // Module filter
  modules: string[];
  activeModule: string;
  onModuleChange: (mod: string) => void;

  // Bulk actions
  onSelectAll: () => void;
  onClearAll:  () => void;

  // Save / reset
  pendingCount: number;
  saving: boolean;
  loading: boolean;
  onSave:  () => void;
  onReset: () => void;

  // Stats
  staffCount: number;
  notHiredCount: number;
  visibleFeatureCount: number;
  totalFeatureCount: number;

  // Source toggle (optional)
  showSource?: boolean;
  onToggleSource?: () => void;
}

export default function MatrixToolbar({
  deptName,
  departments, selectedDept, onDeptChange,
  modules, activeModule, onModuleChange,
  onSelectAll, onClearAll,
  pendingCount, saving, loading, onSave, onReset,
  staffCount, notHiredCount, visibleFeatureCount, totalFeatureCount,
  showSource, onToggleSource,
}: MatrixToolbarProps) {
  return (
    <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 border-b border-slate-200 bg-white">
      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
            <Shield size={18} className="text-indigo-500" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800">
              {deptName || "Branch"} — Permission Matrix
            </h1>
            <p className="text-xs font-medium text-slate-400">
              Grouped by role ·{" "}
              <span className="text-amber-500 font-bold">amber</span> = override ·{" "}
              <span className="text-sky-500 font-bold">blue ring</span> = unsaved
            </p>
          </div>
        </div>

        {/* Save / reset */}
        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">
              {pendingCount} unsaved
            </span>
          )}
          <button
            onClick={onReset}
            disabled={saving || pendingCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm disabled:opacity-40"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            onClick={onSave}
            disabled={saving || loading || pendingCount === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-40"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Toolbar row */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {/* Dept selector */}
        <div className="relative">
          <select
            value={selectedDept}
            onChange={e => onDeptChange(e.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none min-w-[180px]"
          >
            <option value="">Select Branch…</option>
            {departments.map(d => (
              <option key={d.id} value={String(d.id)}>
                {d.name}{d.label !== "Branch" ? ` (${d.label})` : ""}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {/* Bulk actions */}
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <CheckSquare size={12} /> Select All
        </button>
        <button
          onClick={onClearAll}
          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
        >
          <Square size={12} /> Clear All
        </button>

        {/* Module filter tabs */}
        {modules.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap ml-2">
            {["All", ...modules].map(mod => (
              <button
                key={mod}
                onClick={() => onModuleChange(mod)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                  activeModule === mod
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {mod}
              </button>
            ))}
          </div>
        )}

        {/* Source toggle */}
        {onToggleSource && (
          <button
            onClick={onToggleSource}
            className={`ml-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all border ${
              showSource
                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {showSource ? "Hide Source" : "Show Source"}
          </button>
        )}

        {/* Stats */}
        <span className="ml-auto text-[11px] font-bold text-slate-400">
          {staffCount} person{staffCount !== 1 ? "s" : ""} ·{" "}
          {notHiredCount > 0 && (
            <span className="text-amber-500">{notHiredCount} not hired · </span>
          )}
          {visibleFeatureCount}/{totalFeatureCount} features
        </span>
      </div>
    </div>
  );
}
