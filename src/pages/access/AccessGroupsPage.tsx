/**
 * AccessGroupsPage — /access/groups
 *
 * Role-based access groups management.
 * Refactored to use separate components from src/components/access/
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Plus, Search, X, Loader2, AlertCircle, Zap, RefreshCw,
} from "lucide-react";
import { accessApi, type AccessGroupDto, type FeatureDto } from "../../api/accessApi";
import { menuApi, type ApiMenuItem } from "../../api/menuApi";
import { staffApi } from "../../api/staffApi";
import type { StaffDto } from "../../types";
import { flattenMenuToFeatures } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { PERMISSIONS } from "../../lib/permissions";
import {
  toArr, roleBadge,
  GroupModal, GroupPanel, GroupTable, DeleteGroupModal,
} from "../../components/access";

export default function AccessGroupsPage() {
  const { accessibleData, hasPermission } = useAuth();
  
  // ── State ───────────────────────────────────────────────────────────────
  const [groups, setGroups]           = useState<AccessGroupDto[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDto[]>([]);
  const [allStaff, setAllStaff]       = useState<StaffDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [query, setQuery]             = useState("");
  const [seeding, setSeeding]         = useState(false);
  const [seedMsg, setSeedMsg]         = useState<string | null>(null);
  const [syncMsg, setSyncMsg]         = useState<string | null>(null);
  const [syncing, setSyncing]         = useState(false);

  // Modal states
  const [createOpen, setCreateOpen]       = useState(false);
  const [editTarget, setEditTarget]       = useState<AccessGroupDto | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<AccessGroupDto | null>(null);
  const [viewTarget, setViewTarget]       = useState<AccessGroupDto | null>(null);

  // ── Fetch all data ──────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      
      // Always fetch all groups directly (don't use filtered accessibleData)
      // Access Groups page should show all groups for management
      const groupsData = await accessApi.getGroups();
      
      // Use accessible data for staff if available
      const staffData = accessibleData.staff.length > 0
        ? accessibleData.staff
        : await staffApi.getAll();
      
      const [f, menus] = await Promise.all([
        accessApi.getAllFeatures(),
        menuApi.getSidebarTree().catch(() => [] as ApiMenuItem[]),
      ]);
      
      setGroups(toArr<AccessGroupDto>(groupsData));
      // Merge API features + menu features
      const menuFeats = flattenMenuToFeatures(menus);
      setAllFeatures([...toArr<FeatureDto>(f), ...menuFeats]);
      setAllStaff(toArr<StaffDto>(staffData));
    } catch {
      setError("Failed to load access groups.");
    } finally {
      setLoading(false);
    }
  }, [accessibleData.staff]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Update editTarget and viewTarget when groups change ────────────────
  useEffect(() => {
    if (editTarget) {
      const updated = groups.find(g => g.groupId === editTarget.groupId);
      if (updated) {
        setEditTarget(updated);
      }
    }
    if (viewTarget) {
      const updated = groups.find(g => g.groupId === viewTarget.groupId);
      if (updated) {
        setViewTarget(updated);
      }
    }
  }, [groups, editTarget, viewTarget]);

  // ── Seed from job titles ────────────────────────────────────────────────
  const seedFromJobTitles = async () => {
    try {
      setSeeding(true); setSeedMsg(null);
      const titles = Array.from(new Set(allStaff.map(s => s.jobTitle).filter(Boolean))) as string[];
      const existing = new Set(groups.map(g => g.groupName.toLowerCase()));
      let created = 0;
      for (const t of titles) {
        if (existing.has(t.toLowerCase())) continue;
        try {
          await accessApi.createGroup({
            groupName: t,
            description: `Auto-created group for ${t} role`,
            featureKeys: [],
          });
          created++;
        } catch { /* skip */ }
      }
      await fetchAll();
      setSeedMsg(
        created > 0
          ? `✅ Created ${created} group${created !== 1 ? "s" : ""} from job titles`
          : "ℹ️ All job title groups already exist"
      );
      setTimeout(() => setSeedMsg(null), 4000);
    } catch {
      setSeedMsg("❌ Failed to seed groups");
    } finally {
      setSeeding(false);
    }
  };

  // ── Sync all groups to matrix ───────────────────────────────────────────
  const syncAllGroups = async () => {
    try {
      setSyncing(true); setSyncMsg(null);
      let totalStaff = 0;
      let totalPerms = 0;
      for (const g of groups) {
        try {
          const res = await accessApi.syncGroupToMatrix(g.groupId);
          if (res.success) {
            totalStaff += res.staffSynced ?? 0;
            totalPerms += res.permissionsSynced ?? 0;
          }
        } catch { /* skip failed groups */ }
      }
      setSyncMsg(`✅ Synced ${totalStaff} staff members with ${totalPerms} permissions`);
      setTimeout(() => setSyncMsg(null), 5000);
    } catch {
      setSyncMsg("❌ Failed to sync groups");
    } finally {
      setSyncing(false);
    }
  };

  // ── Delete handler ──────────────────────────────────────────────────────
  const handleDelete = async (group: AccessGroupDto) => {
    try {
      await accessApi.deleteGroup(group.groupId);
      await fetchAll();
      setDeleteTarget(null);
    } catch (e: unknown) {
      const er = e as { response?: { data?: { message?: string } } };
      alert(er.response?.data?.message ?? "Failed to delete group.");
    }
  };

  // ── Save handler (from GroupModal) ──────────────────────────────────────
  const handleSaved = (msg?: string) => {
    // Refresh all groups data
    fetchAll();
    
    if (msg) {
      setSyncMsg(msg);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      groups.filter(g => {
        const q = query.toLowerCase();
        return (
          !q ||
          g.groupName.toLowerCase().includes(q) ||
          (g.description ?? "").toLowerCase().includes(q)
        );
      }),
    [groups, query]
  );

  const unseeded = useMemo(
    () =>
      Array.from(new Set(allStaff.map(s => s.jobTitle).filter(Boolean) as string[])).filter(
        t => !groups.some(g => g.groupName.toLowerCase() === t.toLowerCase())
      ),
    [allStaff, groups]
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 lg:px-8 pt-5 pb-4 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <Layers size={18} className="text-indigo-500" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800">Access Groups</h1>
              <p className="text-xs font-medium text-slate-400">
                {groups.length} groups · {allFeatures.length} total features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unseeded.length > 0 && hasPermission(PERMISSIONS.ACCESS_GROUP_CREATE) && (
              <button
                onClick={seedFromJobTitles}
                disabled={seeding}
                className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                title={`Create groups for: ${unseeded.join(", ")}`}
              >
                {seeding ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                Seed from Job Titles ({unseeded.length})
              </button>
            )}
            {hasPermission(PERMISSIONS.ACCESS_GROUP_EDIT) && (
              <button
                onClick={syncAllGroups}
                disabled={syncing || groups.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                title="Sync all group permissions to department matrix"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sync All Groups
              </button>
            )}
            {hasPermission(PERMISSIONS.ACCESS_GROUP_CREATE) && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-black text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus size={15} /> Create Group
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-5 flex flex-col">
        {/* Sync success message */}
        {syncMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700 shrink-0"
          >
            ✅ {syncMsg}
          </motion.div>
        )}

        {/* Seed message */}
        {seedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700 shrink-0"
          >
            {seedMsg}
          </motion.div>
        )}

        {/* Unseeded hint - only show if user can seed */}
        {!loading && unseeded.length > 0 && hasPermission(PERMISSIONS.ACCESS_GROUP_CREATE) && (
          <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 shrink-0">
            <p className="text-xs font-black text-amber-700 mb-2">
              💡 {unseeded.length} job title{unseeded.length !== 1 ? "s" : ""} without a group:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {unseeded.map(t => (
                <span
                  key={t}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ${roleBadge(t)}`}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-4 relative max-w-sm shrink-0">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search groups…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-600 shrink-0">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar rounded-2xl border border-slate-200 bg-white shadow-sm">
          <GroupTable
            groups={filtered}
            loading={loading}
            query={query}
            onView={g => setViewTarget(g)}
            onEdit={g => setEditTarget(g)}
            onDelete={g => setDeleteTarget(g)}
            onCreateFirst={() => setCreateOpen(true)}
          />
        </div>

        <p className="mt-2 text-right text-[11px] font-bold text-slate-400 shrink-0">
          Showing {filtered.length} of {groups.length} group{groups.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {createOpen && (
          <GroupModal
            mode="create"
            allFeatures={allFeatures}
            onClose={() => setCreateOpen(false)}
            onSaved={handleSaved}
          />
        )}
        {editTarget && (
          <GroupModal
            mode="edit"
            group={editTarget}
            allFeatures={allFeatures}
            onClose={() => setEditTarget(null)}
            onSaved={handleSaved}
          />
        )}
        {deleteTarget && (
          <DeleteGroupModal
            group={deleteTarget}
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
          />
        )}
        {viewTarget && (
          <GroupPanel
            group={viewTarget}
            allFeatures={allFeatures}
            allStaff={allStaff}
            onClose={() => setViewTarget(null)}
            onRefresh={fetchAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
