/**
 * src/components/access/GroupPanel.tsx
 *
 * Slide-in side panel showing group details:
 *  - Stats (feature count, staff count)
 *  - SyncInfoBanner (auto-sync info + manual sync button)
 *  - Assigned staff list with remove action
 *  - Add staff search
 *  - Feature list grouped by module
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  X, Loader2, Users, Check, CheckSquare,
  UserPlus, UserMinus, ExternalLink,
} from "lucide-react";
import { accessApi, type AccessGroupDto, type FeatureDto } from "../../api/accessApi";
import type { StaffDto } from "../../types";
import { toArr, byModule, grad } from "./accessHelpers";
import SyncInfoBanner from "./SyncInfoBanner";

interface GroupPanelProps {
  group: AccessGroupDto;
  allFeatures: FeatureDto[];
  allStaff: StaffDto[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function GroupPanel({ group, allFeatures, allStaff, onClose, onRefresh }: GroupPanelProps) {
  const navigate = useNavigate();

  const [assigned, setAssigned]     = useState<StaffDto[]>([]);
  const [loadingS, setLoadingS]     = useState(true);
  const [search, setSearch]         = useState("");
  const [assigning, setAssigning]   = useState<string | null>(null);
  const [removing, setRemoving]     = useState<string | null>(null);

  const safeFeats = toArr<string>(group.features);
  const grouped   = useMemo(
    () => byModule(toArr<FeatureDto>(allFeatures).filter(f => safeFeats.includes(f.featureKey))),
    [allFeatures, safeFeats]
  );
  const mods = Object.keys(grouped);

  // ── Load staff assigned to this group ──────────────────────────────────
  const loadStaff = useCallback(async () => {
    try {
      setLoadingS(true);
      const all = await staffApi.getAll();
      const inGroup: StaffDto[] = [];
      await Promise.all(
        all.map(async s => {
          try {
            const gs = await accessApi.getStaffGroups(s.staffId);
            if (toArr(gs).some((g: unknown) => (g as { groupId: number }).groupId === group.groupId))
              inGroup.push(s);
          } catch { /* skip */ }
        })
      );
      setAssigned(inGroup);
    } catch { /* silent */ } finally {
      setLoadingS(false);
    }
  }, [group.groupId]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const assignedIds = useMemo(() => new Set(assigned.map(s => s.staffId)), [assigned]);

  const available = useMemo(() =>
    allStaff.filter(s => {
      if (assignedIds.has(s.staffId)) return false;
      const q = search.toLowerCase();
      return !q
        || s.fullName.toLowerCase().includes(q)
        || (s.loginId ?? "").toLowerCase().includes(q)
        || s.jobTitle.toLowerCase().includes(q);
    }),
    [allStaff, assignedIds, search]
  );

  const assign = async (id: string) => {
    try {
      setAssigning(id);
      await accessApi.addStaffToGroup(id, group.groupId);
      await loadStaff();
      onRefresh();
    } catch { /* silent */ } finally { setAssigning(null); }
  };

  const remove = async (id: string) => {
    try {
      setRemoving(id);
      await accessApi.removeStaffFromGroup(id, group.groupId);
      await loadStaff();
      onRefresh();
    } catch { /* silent */ } finally { setRemoving(null); }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white bg-gradient-to-br ${grad(group.groupName)}`}>
              {group.groupName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">{group.groupName}</h2>
              {group.description && (
                <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 p-5 pb-0">
            <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-center">
              <p className="text-2xl font-black text-indigo-600">{safeFeats.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mt-0.5">Features</p>
            </div>
            <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-center">
              <p className="text-2xl font-black text-sky-600">{assigned.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-400 mt-0.5">Staff</p>
            </div>
          </div>

          {/* Sync info banner */}
          <div className="px-5 pt-4">
            <SyncInfoBanner groupId={group.groupId} onSynced={onRefresh} />
          </div>

          {/* Assigned staff */}
          <div className="p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Assigned Staff ({assigned.length})
            </p>
            {loadingS ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            ) : assigned.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <Users size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">No staff assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assigned.map(s => (
                  <div key={s.staffId} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad(s.fullName)} text-xs font-black text-white`}>
                      {s.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{s.fullName}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{s.loginId} · {s.jobTitle}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/access/staff/${s.staffId}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-indigo-500 transition-colors"
                        title="View permissions"
                      >
                        <ExternalLink size={13} />
                      </button>
                      <button
                        onClick={() => remove(s.staffId)}
                        disabled={removing === s.staffId}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {removing === s.staffId
                          ? <Loader2 size={13} className="animate-spin" />
                          : <UserMinus size={13} />
                        }
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add staff */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Add Staff to Group
            </p>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, ID, job title…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-4 text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none mb-2"
            />
            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {available.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {search ? "No staff match" : "All staff assigned"}
                </p>
              ) : available.slice(0, 25).map(s => (
                <div key={s.staffId} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${grad(s.fullName)} text-[10px] font-black text-white`}>
                    {s.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{s.fullName}</p>
                    <p className="text-[10px] text-slate-400">{s.loginId} · {s.jobTitle}</p>
                  </div>
                  <button
                    onClick={() => assign(s.staffId)}
                    disabled={assigning === s.staffId}
                    className="flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {assigning === s.staffId
                      ? <Loader2 size={11} className="animate-spin" />
                      : <UserPlus size={11} />
                    } Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Features list */}
          <div className="px-5 pb-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Features ({safeFeats.length})
            </p>
            {mods.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <CheckSquare size={28} className="mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">No features assigned — click Edit to add</p>
              </div>
            ) : mods.map(mod => (
              <div key={mod} className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden mb-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{mod}</span>
                </div>
                <div className="p-3 space-y-1">
                  {(grouped[mod] ?? []).map(f => (
                    <div key={f.featureKey} className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-3 py-1.5">
                      <div className="h-3.5 w-3.5 rounded border-2 bg-indigo-500 border-indigo-500 flex items-center justify-center shrink-0">
                        <Check size={9} strokeWidth={3} className="text-white" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 flex-1">{f.featureName}</p>
                      <span className="text-[9px] font-mono text-slate-400">{f.featureKey}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </motion.div>
    </>
  );
}

// staffApi is used inside this component — import it here to keep the file self-contained
import { staffApi } from "../../api/staffApi";
