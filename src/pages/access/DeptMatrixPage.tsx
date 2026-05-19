/**
 * DeptMatrixPage — /access/dept/:deptId
 *
 * Hierarchical Permission Matrix grouped by role.
 * Refactored to use separate components from src/components/access/
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Check, X } from "lucide-react";
import {
  accessApi,
  type MatrixResponse,
  type FeatureDto,
} from "../../api/accessApi";
import { menuApi, type ApiMenuItem } from "../../api/menuApi";
import { orgTreeApi } from "../../api/orgTreeApi";
import type { OrgNode } from "../../types";
import { flattenMenuToFeatures } from "../../lib/utils";
import {
  groupByRole, groupByModule, buildPermMap,
  type PermMap,
  MatrixToolbar, MatrixTable,
} from "../../components/access";

export default function DeptMatrixPage() {
  const { deptId } = useParams<{ deptId: string }>();

  // ── State ───────────────────────────────────────────────────────────────
  const [departments, setDepartments]     = useState<OrgNode[]>([]);
  const [selectedDept, setSelectedDept]   = useState<string>(deptId ?? "");
  const [deptName, setDeptName]           = useState<string>("");
  const [matrixData, setMatrixData]       = useState<MatrixResponse | null>(null);
  const [localPerms, setLocalPerms]       = useState<PermMap>({});
  const [originalPerms, setOriginalPerms] = useState<PermMap>({});
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess]     = useState(false);
  const [activeModule, setActiveModule]   = useState<string>("All");
  const [showSource, setShowSource]       = useState(false);

  // ── Load departments ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      orgTreeApi.getByLabel("Branch").catch(() => [] as OrgNode[]),
      orgTreeApi.getByLabel("Department").catch(() => [] as OrgNode[]),
    ]).then(([branches, depts]) => {
      const seen = new Set<number>();
      const unique = [...branches, ...depts].filter(n => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      setDepartments(unique);
      if (!selectedDept && unique.length > 0) setSelectedDept(String(unique[0].id));
    });
  }, []);

  // ── Update dept name ────────────────────────────────────────────────────
  useEffect(() => {
    const found = departments.find(d => String(d.id) === selectedDept);
    setDeptName(found?.name ?? "");
  }, [selectedDept, departments]);

  // ── Load matrix ─────────────────────────────────────────────────────────
  const loadMatrix = useCallback(async () => {
    if (!selectedDept) return;
    try {
      setLoading(true); setError(null);
      const [data, menus] = await Promise.all([
        accessApi.getDeptMatrix(selectedDept),
        menuApi.getSidebarTree().catch(() => [] as ApiMenuItem[]),
      ]);
      // Merge API features + menu features
      const menuFeats = flattenMenuToFeatures(menus);
      const mergedFeatures: FeatureDto[] = [
        ...(data.features ?? []),
        ...menuFeats.filter(mf => !(data.features ?? []).some(f => f.featureKey === mf.featureKey)),
      ];
      const mergedData: MatrixResponse = { ...data, features: mergedFeatures };
      setMatrixData(mergedData);
      const perms = buildPermMap(mergedData.staff ?? []);
      setLocalPerms(perms);
      setOriginalPerms(JSON.parse(JSON.stringify(perms)));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to load permission matrix.");
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => { loadMatrix(); }, [loadMatrix]);

  // ── Derived data ────────────────────────────────────────────────────────
  const features   = useMemo(() => matrixData?.features ?? [], [matrixData]);
  const staff      = useMemo(() => matrixData?.staff    ?? [], [matrixData]);
  const grouped    = useMemo(() => groupByModule(features), [features]);
  const modules    = useMemo(() => Object.keys(grouped), [grouped]);
  const roleGroups = useMemo(() => groupByRole(staff), [staff]);

  const visibleFeatures = useMemo(() => {
    if (activeModule === "All") return features;
    return grouped[activeModule] ?? [];
  }, [activeModule, features, grouped]);

  const visibleGrouped = useMemo(() => groupByModule(visibleFeatures), [visibleFeatures]);
  const visibleModules = useMemo(() => Object.keys(visibleGrouped), [visibleGrouped]);

  const pendingCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(localPerms)) {
      for (const fk of Object.keys(localPerms[key])) {
        if ((localPerms[key][fk] ?? false) !== (originalPerms[key]?.[fk] ?? false)) count++;
      }
    }
    return count;
  }, [localPerms, originalPerms]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleToggleCell = useCallback((key: string, fk: string) => {
    setLocalPerms(prev => ({
      ...prev,
      [key]: { ...prev[key], [fk]: !(prev[key]?.[fk] ?? false) },
    }));
  }, []);

  const handleRoleToggle = useCallback(
    (jobTitle: string, fk: string, value: boolean) => {
      setLocalPerms(prev => {
        const next = { ...prev };
        for (const r of staff) {
          if ((r.jobTitle ?? "Unassigned") !== jobTitle) continue;
          if (!r.staffId) continue;
          const key = r.staffId ?? r.personId;
          next[key] = { ...next[key], [fk]: value };
        }
        return next;
      });
    },
    [staff]
  );

  const handleSelectAllRow = useCallback(
    (key: string) => {
      setLocalPerms(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...Object.fromEntries(visibleFeatures.map(f => [f.featureKey, true])),
        },
      }));
    },
    [visibleFeatures]
  );

  const handleClearRow = useCallback(
    (key: string) => {
      setLocalPerms(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          ...Object.fromEntries(visibleFeatures.map(f => [f.featureKey, false])),
        },
      }));
    },
    [visibleFeatures]
  );

  const handleSelectAll = useCallback(() => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const r of staff) {
        if (!r.staffId) continue;
        const key = r.staffId ?? r.personId;
        next[key] = {
          ...next[key],
          ...Object.fromEntries(visibleFeatures.map(f => [f.featureKey, true])),
        };
      }
      return next;
    });
  }, [staff, visibleFeatures]);

  const handleClearAll = useCallback(() => {
    setLocalPerms(prev => {
      const next = { ...prev };
      for (const r of staff) {
        const key = r.staffId ?? r.personId;
        next[key] = {
          ...next[key],
          ...Object.fromEntries(visibleFeatures.map(f => [f.featureKey, false])),
        };
      }
      return next;
    });
  }, [staff, visibleFeatures]);

  const handleReset = useCallback(() => {
    setLocalPerms(JSON.parse(JSON.stringify(originalPerms)));
  }, [originalPerms]);

  const handleSave = async () => {
    if (!selectedDept || !matrixData) return;
    try {
      setSaving(true); setError(null);
      const items: { staffId: string; featureKey: string; hasAccess: boolean }[] = [];
      for (const r of staff) {
        if (!r.staffId) continue;
        const key = r.staffId ?? r.personId;
        // Save ALL features (not just visible) to avoid losing hidden module data
        for (const f of features) {
          items.push({
            staffId:    r.staffId,
            featureKey: f.featureKey,
            hasAccess:  localPerms[key]?.[f.featureKey] ?? false,
          });
        }
      }
      await accessApi.saveDeptMatrix(selectedDept, { items });
      setOriginalPerms(JSON.parse(JSON.stringify(localPerms)));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to save permissions. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Toolbar */}
      <MatrixToolbar
        deptName={deptName}
        departments={departments}
        selectedDept={selectedDept}
        onDeptChange={setSelectedDept}
        modules={modules}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        onSelectAll={handleSelectAll}
        onClearAll={handleClearAll}
        pendingCount={pendingCount}
        saving={saving}
        loading={loading}
        onSave={handleSave}
        onReset={handleReset}
        staffCount={staff.length}
        notHiredCount={staff.filter(r => !r.isHired).length}
        visibleFeatureCount={visibleFeatures.length}
        totalFeatureCount={features.length}
        showSource={showSource}
        onToggleSource={() => setShowSource(v => !v)}
      />

      {/* Banners */}
      <div className="shrink-0 px-5 lg:px-8">
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-700"
            >
              <Check size={14} /> Permissions saved successfully
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600"
            >
              <AlertCircle size={14} /> {error}
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Matrix table */}
      <div className="flex-1 min-h-0 overflow-hidden px-5 lg:px-8 py-4">
        <MatrixTable
          loading={loading}
          roleGroups={roleGroups}
          features={features}
          visibleFeatures={visibleFeatures}
          visibleModules={visibleModules}
          visibleGrouped={visibleGrouped}
          localPerms={localPerms}
          originalPerms={originalPerms}
          showSource={showSource}
          onToggleCell={handleToggleCell}
          onRoleToggle={handleRoleToggle}
          onSelectAllRow={handleSelectAllRow}
          onClearRow={handleClearRow}
        />
      </div>
    </div>
  );
}
