/**
 * src/components/access/DeleteGroupModal.tsx
 *
 * Confirmation modal for deleting an access group.
 */
import { motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { AccessGroupDto } from "../../api/accessApi";

interface DeleteGroupModalProps {
  group: AccessGroupDto;
  onCancel: () => void;
  onConfirm: (group: AccessGroupDto) => void;
}

export default function DeleteGroupModal({ group, onCancel, onConfirm }: DeleteGroupModalProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>

        <h2 className="text-center text-lg font-black text-slate-800">Delete Group?</h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500">
          <strong>{group.groupName}</strong> will be permanently removed.
        </p>

        {group.staffCount > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-700">
            ⚠️ {group.staffCount} staff will lose this group's access.
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(group)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}
