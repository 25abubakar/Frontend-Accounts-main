import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Edit2, Trash2, X, Loader2, AlertCircle,
  Shield, Users, CheckSquare, ChevronDown, Check, Save,
  AlertTriangle, Layers,
} from "lucide-react";
import { accessApi, type AccessGroupDto, type FeatureDto, type CreateGroupDto } from "../../api/accessApi";

// ── helpers ───────────────────────────────────────────────────────────────
function groupByModule(features: FeatureDto[]): Record<string, FeatureDto[]> {
  return features.reduce<Record<string, FeatureDto[]>>((acc, f) => {
    if (!acc[f.module]) acc[f.module] = [];
    acc[f.module].push(f);
    return acc;
  }, {});
}

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all";
const LABEL = "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block";

// ── Create / Edit Group Modal ─────────────────────────────────────────────
interface GroupModalProps {
  mode: "create" | "edit";
  group?: AccessGroupDto;
  allFeatures: FeatureDto[];
  onClose: () => void;
  onSaved: () => void;
}

function GroupModal({ mode, group, allFeatures, onClose, onSaved }: GroupModalProps) {
  const [name, setName] = useState(group?.groupName ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(group?.features ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = groupByModule(allFeatures);
  const modules = Object.keys(grouped);

  const toggleFeature = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleModule = (mod: string) => {
    const keys = grouped[mod].map(f => f.featureKey);
    const allSelected = keys.every(k => selectedKeys.has(k));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Group name is required."); return; }
    try {
      setSaving(true);
      setError(null);
      const payload: CreateGroupDto = {
        groupName: name.trim(),
        description: description.trim() || undefined,
        featureKeys: Array.from(selectedKeys),
      };
      if (mode === "create") {
        await accessApi.createGroup(payload);
      } else if (group) {
        await accessApi.updateGroup(group.groupId, payload);
        // Also update features separately
        await accessApi.updateGroupFeatures(group.groupId, { featureKeys: Array.from(selectedKeys) });
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to save group.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
              <Shield size={18} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                {mode === "create" ? "Create Access Group" : "Edit Access Group"}
              </h2>
              {group && <p className="text-xs font-semibold text-slate-400">ID: {group.groupId}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className={LABEL}>Group Name <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. HR Managers" className={INPUT} />
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Optional description…" rows={2}
              className={`${INPUT} resize-none`} />
          </div>

          {/* Features checklist */}
          <div>
            <label className={LABEL}>Features ({selectedKeys.size} selected)</label>
            <div className="space-y-3">
              {modules.map(mod => {
                const modFeatures = grouped[mod];
                const allSelected = modFeatures.every(f => selectedKeys.has(f.featureKey));
                const someSelected = modFeatures.some(f => selectedKeys.has(f.featureKey));

                return (
                  <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                    {/* Module header */}
                    <button
                      onClick={() => toggleModule(mod)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                          allSelected ? "bg-indigo-500 border-indigo-500" :
                          someSelected ? "bg-indigo-200 border-indigo-400" :
                          "border-slate-300 bg-white"
                        }`}>
                          {allSelected && <Check size={10} strokeWidth={3} className="text-white" />}
                          {someSelected && !allSelected && <div className="h-1.5 w-1.5 rounded-sm bg-indigo-500" />}
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">{mod}</span>
                        <span className="text-[10px] font-bold text-slate-400">
                          ({modFeatures.filter(f => selectedKeys.has(f.featureKey)).length}/{modFeatures.length})
                        </span>
                      </div>
                      <ChevronDown size={13} className="text-slate-400" />
                    </button>

                    {/* Feature items */}
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {modFeatures.map(f => {
                        const checked = selectedKeys.has(f.featureKey);
                        return (
                          <button
                            key={f.featureKey}
                            onClick={() => toggleFeature(f.featureKey)}
                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                              checked ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              checked ? "bg-indigo-500 border-indigo-500" : "border-slate-300"
                            }`}>
                              {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
                                {f.featureKey}
                              </p>
                              <p className="text-xs font-semibold text-slate-700 truncate">{f.featureName}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 shrink-0">
          <button onClick={onClose} disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mode === "create" ? "Create Group" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────
function DeleteGroupModal({ group, onClose, onDeleted }: { group: AccessGroupDto; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await accessApi.deleteGroup(group.groupId);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to delete group.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
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
          <strong>{group.groupName}</strong> will be permanently removed along with all its permissions.
        </p>
        {group.staffCount > 0 && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-700">
            ⚠️ {group.staffCount} staff member{group.staffCount !== 1 ? "s" : ""} will lose access from this group.
          </div>
        )}
        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600 disabled:opacity-50">
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Group Detail Panel ────────────────────────────────────────────────────
function GroupDetailPanel({ group, allFeatures, onClose }: { group: AccessGroupDto; allFeatures: FeatureDto[]; onClose: () => void }) {
  const grouped = groupByModule(allFeatures.filter(f => group.features.includes(f.featureKey)));
  const modules = Object.keys(grouped);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-800">{group.groupName}</h2>
            {group.description && <p className="text-xs font-medium text-slate-400 mt-0.5">{group.description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-center">
              <p className="text-2xl font-black text-indigo-600">{group.features.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-0.5">Features</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
              <p className="text-2xl font-black text-sky-600">{group.staffCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mt-0.5">Staff</p>
            </div>
          </div>

          {/* Features by module */}
          {modules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <CheckSquare size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-sm font-bold text-slate-400">No features assigned</p>
            </div>
          ) : (
            modules.map(mod => (
              <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                </div>
                <div className="p-3 space-y-1.5">
                  {grouped[mod].map(f => (
                    <div key={f.featureKey}
                      className="flex items-center gap-2.5 rounded-xl bg-white border border-slate-100 px-3 py-2">
                      <div className="h-4 w-4 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center shrink-0">
                        <Check size={10} strokeWidth={3} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{f.featureKey}</p>
                        <p className="text-xs font-semibold text-slate-700">{f.featureName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AccessGroupsPage() {
  const [groups, setGroups] = useState<AccessGroupDto[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccessGroupDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessGroupDto | null>(null);
  const [viewTarget, setViewTarget] = useState<AccessGroupDto | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [grps, feats] = await Promise.all([
        accessApi.getGroups(),
        accessApi.getAllFeatures(),
      ]);
      setGroups(grps);
      setAllFeatures(feats);
    } catch {
      setError("Failed to load access groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = groups.filter(g => {
    const q = query.toLowerCase();
    return !q || g.groupName.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Layers size={18} className="text-indigo-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Access Groups</h1>
          </div>
          <p className="text-sm font-medium text-slate-400 ml-12">
            {groups.length} group{groups.length !== 1 ? "s" : ""} · {allFeatures.length} total features
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} /> Create Group
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 relative max-w-md">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search groups…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
        />
        {query && (
          <button onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={15} />
          </button>
        )}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white">
          <Layers size={40} className="text-slate-200" strokeWidth={1.5} />
          <p className="text-sm font-bold text-slate-500">
            {query ? "No groups match your search" : "No access groups yet"}
          </p>
          {!query && (
            <button onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-indigo-500 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-600">
              Create First Group
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-slate-50/95 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-6 py-4 text-left">Group Name</th>
                <th className="border-b border-slate-200 px-6 py-4 text-left">Description</th>
                <th className="border-b border-slate-200 px-6 py-4 text-center">Features</th>
                <th className="border-b border-slate-200 px-6 py-4 text-center">Staff</th>
                <th className="border-b border-slate-200 px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((group, idx) => (
                <motion.tr
                  key={group.groupId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="group transition-colors hover:bg-indigo-50/30"
                >
                  {/* Name */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <button
                      onClick={() => setViewTarget(group)}
                      className="flex items-center gap-3 hover:text-indigo-600 transition-colors"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 shrink-0">
                        <Shield size={15} className="text-indigo-500" />
                      </div>
                      <span className="font-bold text-slate-800 group-hover:text-indigo-600">{group.groupName}</span>
                    </button>
                  </td>

                  {/* Description */}
                  <td className="border-b border-slate-100 px-6 py-4 text-xs font-medium text-slate-500 max-w-[200px]">
                    <span className="truncate block">{group.description || "—"}</span>
                  </td>

                  {/* Features count */}
                  <td className="border-b border-slate-100 px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                      <CheckSquare size={11} /> {group.features.length}
                    </span>
                  </td>

                  {/* Staff count */}
                  <td className="border-b border-slate-100 px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-600 ring-1 ring-inset ring-sky-500/10">
                      <Users size={11} /> {group.staffCount}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="border-b border-slate-100 px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setEditTarget(group)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500" title="Edit">
                        <Edit2 size={15} strokeWidth={2.5} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteTarget(group)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                        <Trash2 size={15} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-right text-[11px] font-bold text-slate-400">
        Showing {filtered.length} of {groups.length} group{groups.length !== 1 ? "s" : ""}
      </p>

      {/* Modals */}
      <AnimatePresence>
        {createOpen && (
          <GroupModal mode="create" allFeatures={allFeatures} onClose={() => setCreateOpen(false)} onSaved={fetchAll} />
        )}
        {editTarget && (
          <GroupModal mode="edit" group={editTarget} allFeatures={allFeatures}
            onClose={() => setEditTarget(null)} onSaved={fetchAll} />
        )}
        {deleteTarget && (
          <DeleteGroupModal group={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchAll} />
        )}
        {viewTarget && (
          <GroupDetailPanel group={viewTarget} allFeatures={allFeatures} onClose={() => setViewTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
