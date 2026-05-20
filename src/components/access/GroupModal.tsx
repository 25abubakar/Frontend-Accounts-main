/**
 * src/components/access/GroupModal.tsx
 *
 * Modal for creating or editing an Access Group.
 * Handles name, description, and feature selection (grouped by module).
 * On edit: calls updateGroupFeatures and shows the backend sync message.
 */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Loader2, Save, Check, ChevronDown } from "lucide-react";
import { accessApi, type AccessGroupDto, type FeatureDto, type CreateGroupDto } from "../../api/accessApi";
import { toArr, byModule, INP, LBL } from "./accessHelpers";

interface GroupModalProps {
  mode: "create" | "edit";
  group?: AccessGroupDto;
  allFeatures: FeatureDto[];
  onClose: () => void;
  onSaved: (syncMsg?: string) => void;
}

export default function GroupModal({ mode, group, allFeatures, onClose, onSaved }: GroupModalProps) {
  const [name, setName]     = useState(group?.groupName ?? "");
  const [desc, setDesc]     = useState(group?.description ?? "");
  const [sel, setSel]       = useState<Set<string>>(() => new Set(toArr<string>(group?.features)));
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);

  // ── Sync sel when group.features changes (e.g. after parent refreshes) ─
  useEffect(() => {
    if (group?.features) {
      setSel(new Set(toArr<string>(group.features)));
    }
  }, [group?.features, group?.groupId]);

  const safe    = toArr<FeatureDto>(allFeatures);
  const grouped = useMemo(() => byModule(safe), [safe]);
  const mods    = Object.keys(grouped);

  const toggle = (k: string) =>
    setSel(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const toggleMod = (m: string) => {
    const keys = (grouped[m] ?? []).map(f => f.featureKey);
    const all  = keys.every(k => sel.has(k));
    setSel(p => {
      const n = new Set(p);
      all ? keys.forEach(k => n.delete(k)) : keys.forEach(k => n.add(k));
      return n;
    });
  };

  const save = async () => {
    if (!name.trim()) { setErr("Group name is required."); return; }
    try {
      setSaving(true); setErr(null);
      
      let syncMsg: string | undefined;

      if (mode === "create") {
        const payload: CreateGroupDto = {
          groupName:   name.trim(),
          description: desc.trim() || undefined,
          featureKeys: Array.from(sel),
        };
        await accessApi.createGroup(payload);
      } else if (group) {
        // Step 1: Update name/description if changed
        if (name.trim() !== group.groupName || (desc.trim() || undefined) !== group.description) {
          await accessApi.updateGroup(group.groupId, {
            groupName:   name.trim(),
            description: desc.trim() || undefined,
            featureKeys: toArr<string>(group.features), // keep existing features
          });
        }

        // Step 2: Always update features via the dedicated endpoint
        const featureKeys = Array.from(sel);
        const result = await accessApi.updateGroupFeatures(group.groupId, { featureKeys });
        syncMsg = result?.message;

        // Step 3: Fetch the fresh group from backend to confirm what was saved
        try {
          const fresh = await accessApi.getGroupById(group.groupId);
          // Update local sel to match what backend actually saved
          setSel(new Set(toArr<string>(fresh.features)));
        } catch { /* non-critical */ }
      }

      onSaved(syncMsg);
      onClose();
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      setErr(er.response?.data?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
        />

        {/* Modal */}
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
                  {mode === "create" ? "Create Access Group" : `Edit — ${group?.groupName}`}
                </h2>
                <p className="text-[10px] text-slate-400">{sel.size} features selected</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
            {err && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
                {err}
              </div>
            )}

            {/* Auto-sync notice for edit mode */}
            {mode === "edit" && (
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs font-semibold text-blue-700">
                ℹ️ Saving will automatically sync these features to the department matrix for all staff in this group.
              </div>
            )}

            <div>
              <label className={LBL}>Group Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={INP}
                placeholder="e.g. Agent, Manager, Software Team"
              />
            </div>

            <div>
              <label className={LBL}>Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                className={`${INP} resize-none`}
                placeholder="What access does this group provide?"
              />
            </div>

            {/* Feature selector */}
            <div>
              <label className={LBL}>Features ({sel.size} selected)</label>
              <div className="space-y-2">
                {mods.map(mod => {
                  const mf     = grouped[mod] ?? [];
                  const allSel = mf.every(f => sel.has(f.featureKey));
                  const someSel = mf.some(f => sel.has(f.featureKey));
                  return (
                    <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => toggleMod(mod)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all ${
                            allSel  ? "bg-indigo-500 border-indigo-500"
                            : someSel ? "bg-indigo-200 border-indigo-400"
                            : "border-slate-300 bg-white"
                          }`}>
                            {allSel  && <Check size={10} strokeWidth={3} className="text-white" />}
                            {someSel && !allSel && <div className="h-1.5 w-1.5 rounded-sm bg-indigo-500" />}
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700">{mod}</span>
                          <span className="text-[10px] font-bold text-slate-400">
                            ({mf.filter(f => sel.has(f.featureKey)).length}/{mf.length})
                          </span>
                        </div>
                        <ChevronDown size={13} className="text-slate-400" />
                      </button>

                      <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {mf.map(f => {
                          const checked = sel.has(f.featureKey);
                          return (
                            <button
                              key={f.featureKey}
                              onClick={() => toggle(f.featureKey)}
                              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-all ${
                                checked ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-white hover:bg-slate-50"
                              }`}
                            >
                              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
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
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {mode === "create" ? "Create Group" : "Save & Sync"}
            </button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
