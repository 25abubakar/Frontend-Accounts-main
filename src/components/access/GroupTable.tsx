/**
 * src/components/access/GroupTable.tsx
 *
 * Renders the groups list table with actions (view, edit, delete).
 * Pure presentational — all data and callbacks come from props.
 */
import { motion } from "framer-motion";
import { Layers, Loader2, Edit2, Trash2, Users, CheckSquare } from "lucide-react";
import type { AccessGroupDto } from "../../api/accessApi";
import { toArr, roleBadge } from "./accessHelpers";

interface GroupTableProps {
  groups: AccessGroupDto[];
  loading: boolean;
  query: string;
  onView:   (g: AccessGroupDto) => void;
  onEdit:   (g: AccessGroupDto) => void;
  onDelete: (g: AccessGroupDto) => void;
  onCreateFirst: () => void;
}

export default function GroupTable({
  groups, loading, query,
  onView, onEdit, onDelete, onCreateFirst,
}: GroupTableProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Layers size={40} className="text-slate-200" strokeWidth={1.5} />
        <p className="text-sm font-bold text-slate-500">
          {query ? "No groups match" : "No access groups yet"}
        </p>
        {!query && (
          <button
            onClick={onCreateFirst}
            className="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600"
          >
            Create First Group
          </button>
        )}
      </div>
    );
  }

  return (
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
        {groups.map((g, idx) => (
          <motion.tr
            key={g.groupId}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            className="group transition-colors hover:bg-indigo-50/30"
          >
            {/* Name */}
            <td className="border-b border-slate-100 px-6 py-3.5">
              <button
                onClick={() => onView(g)}
                className="flex items-center gap-3 hover:text-indigo-600 transition-colors"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black shrink-0 ${roleBadge(g.groupName)}`}>
                  {g.groupName.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-slate-800 group-hover:text-indigo-600">{g.groupName}</span>
              </button>
            </td>

            {/* Description */}
            <td className="border-b border-slate-100 px-6 py-3.5 text-xs font-medium text-slate-500 max-w-[220px]">
              <span className="truncate block">{g.description || "—"}</span>
            </td>

            {/* Features count */}
            <td className="border-b border-slate-100 px-6 py-3.5 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                <CheckSquare size={11} /> {toArr<string>(g.features).length}
              </span>
            </td>

            {/* Staff count */}
            <td className="border-b border-slate-100 px-6 py-3.5 text-center">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-600 ring-1 ring-inset ring-sky-500/10">
                <Users size={11} /> {g.staffCount}
              </span>
            </td>

            {/* Actions */}
            <td className="border-b border-slate-100 px-6 py-3.5 text-right">
              <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => onEdit(g)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500"
                >
                  <Edit2 size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => onDelete(g)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={14} strokeWidth={2.5} />
                </button>
              </div>
            </td>
          </motion.tr>
        ))}
      </tbody>
    </table>
  );
}
