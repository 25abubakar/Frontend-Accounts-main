import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Briefcase, Plus, Edit2, Trash2, X,
  Save, AlertTriangle, CheckCircle2, AlertCircle, MapPin,
  ChevronDown, Eye,
} from "lucide-react";
import { positionApi } from "../api/positionApi";
import { orgTreeApi } from "../api/orgTreeApi";
import type { VacancyDto, CreatePositionDto, UpdateVacancyDto, OrgNode } from "../types";
import { containerVariants, itemVariants } from "../utils/orgGroupTreeDesign";

// ── helpers ───────────────────────────────────────────────────────────────
const INPUT =
  "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all";
const LABEL = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

// ── Add / Edit Modal ──────────────────────────────────────────────────────
interface PositionModalProps {
  mode: "add" | "edit";
  vacancy?: VacancyDto;
  branches: OrgNode[];
  onClose: () => void;
  onSaved: () => void;
}

function PositionModal({ mode, vacancy, branches, onClose, onSaved }: PositionModalProps) {
  const [orgId, setOrgId] = useState<number>(vacancy?.organizationId ?? 0);
  const [jobTitle, setJobTitle] = useState(vacancy?.jobTitle ?? "");
  const [department, setDepartment] = useState(vacancy?.department ?? "");
  const [previewCode, setPreviewCode] = useState(vacancy?.vacancyCode ?? "");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview code when orgId + jobTitle change
  useEffect(() => {
    if (!orgId || !jobTitle.trim()) { setPreviewCode(""); return; }
    const t = setTimeout(async () => {
      try {
        setLoadingPreview(true);
        const res = await positionApi.previewCode(orgId, jobTitle.trim());
        setPreviewCode(res.vacancyCode);
      } catch { setPreviewCode(""); }
      finally { setLoadingPreview(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [orgId, jobTitle]);

  const handleSave = async () => {
    if (!orgId) { setError("Please select a branch."); return; }
    if (!jobTitle.trim()) { setError("Job title is required."); return; }
    try {
      setSaving(true); setError(null);
      if (mode === "add") {
        const payload: CreatePositionDto = { organizationId: orgId, jobTitle: jobTitle.trim(), department: department.trim() || undefined };
        await positionApi.create(payload);
      } else {
        const payload: UpdateVacancyDto = { organizationId: orgId, jobTitle: jobTitle.trim(), department: department.trim() || undefined };
        await positionApi.update(vacancy!.vacancyId, payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to save position.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
              <Briefcase size={18} className="text-sky-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">{mode === "add" ? "Add Position" : "Edit Position"}</h2>
              {vacancy && <p className="text-xs font-semibold text-slate-400">{vacancy.vacancyCode}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        <div className="space-y-4">
          {/* Branch */}
          <div>
            <label className={LABEL}>Branch <span className="text-red-500">*</span></label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={orgId || ""}
                onChange={e => setOrgId(Number(e.target.value))}
                className={`${INPUT} pl-9`}
              >
                <option value="">Select branch…</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Job Title */}
          <div>
            <label className={LABEL}>Job Title <span className="text-red-500">*</span></label>
            <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer" className={INPUT} />
          </div>

          {/* Department */}
          <div>
            <label className={LABEL}>Department</label>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Engineering" className={INPUT} />
          </div>

          {/* Preview Code */}
          {(previewCode || loadingPreview) && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Vacancy Code Preview</p>
              {loadingPreview ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span className="text-sm font-semibold text-indigo-400">Generating…</span>
                </div>
              ) : (
                <p className="font-mono text-lg font-black text-indigo-700">{previewCode}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {mode === "add" ? "Create Position" : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────
function DeleteModal({ vacancy, onClose, onDeleted }: { vacancy: VacancyDto; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setDeleting(true); setError(null);
      await positionApi.delete(vacancy.vacancyId);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Cannot delete — position may be filled.");
    } finally { setDeleting(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h2 className="text-center text-lg font-black text-slate-800">Delete Position?</h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500">
          <strong>{vacancy.vacancyCode}</strong> — {vacancy.jobTitle} will be permanently removed.
        </p>
        {vacancy.isFilled && (
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-semibold text-amber-700">
            ⚠️ This position is currently filled. Fire the employee first.
          </div>
        )}
        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting || vacancy.isFilled}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600 disabled:opacity-50">
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── View Modal ────────────────────────────────────────────────────────────
function ViewModal({ vacancy, onClose }: { vacancy: VacancyDto; onClose: () => void }) {
  const field = (label: string, value: string | null | undefined) => (
    <div key={label}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value || "—"}</p>
    </div>
  );
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-500/10 mb-2">
              {vacancy.vacancyCode}
            </span>
            <h2 className="text-lg font-black text-slate-800">{vacancy.jobTitle}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 grid grid-cols-2 gap-4">
          {field("Department", vacancy.department)}
          {field("Status", vacancy.isFilled ? "Filled" : "Vacant")}
          {field("Branch", vacancy.branchName)}
          {field("Company", vacancy.companyName)}
          {field("Country", vacancy.countryName)}
          {field("Created", vacancy.createdDate ? new Date(vacancy.createdDate).toLocaleDateString("en-GB") : null)}
          {vacancy.employee && field("Employee", vacancy.employee.fullName)}
          {vacancy.employee && field("Joined", vacancy.employee.joiningDate ? new Date(vacancy.employee.joiningDate).toLocaleDateString("en-GB") : null)}
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">Close</button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
type FilterTab = "all" | "vacant" | "filled";

export default function PositionsPage() {
  const [positions, setPositions] = useState<VacancyDto[]>([]);
  const [branches, setBranches] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VacancyDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VacancyDto | null>(null);
  const [viewTarget, setViewTarget] = useState<VacancyDto | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setApiError(null);
      const [pos, branchNodes] = await Promise.all([
        positionApi.getAll(),
        orgTreeApi.getByLabel("Branch"),
      ]);
      setPositions(pos);
      setBranches(branchNodes);
    } catch {
      setApiError("Unable to connect to the server.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = positions.filter(p => {
    const q = query.toLowerCase();
    const matchSearch = !q ||
      p.jobTitle.toLowerCase().includes(q) ||
      p.vacancyCode.toLowerCase().includes(q) ||
      (p.branchName ?? "").toLowerCase().includes(q) ||
      (p.companyName ?? "").toLowerCase().includes(q) ||
      (p.department ?? "").toLowerCase().includes(q);
    const matchTab =
      tab === "all" ||
      (tab === "vacant" && !p.isFilled) ||
      (tab === "filled" && p.isFilled);
    return matchSearch && matchTab;
  });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",    label: "All",    count: positions.length },
    { key: "vacant", label: "Vacant", count: positions.filter(p => !p.isFilled).length },
    { key: "filled", label: "Filled", count: positions.filter(p => p.isFilled).length },
  ];

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 size={36} className="animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Positions</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-400">
            {positions.length} position{positions.length !== 1 ? "s" : ""} across all branches
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          Add Position
        </button>
      </div>

      {apiError && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <AlertCircle size={16} /> {apiError}
        </div>
      )}

      {/* Search + Tabs */}
      <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, code, branch, department…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          />
          {query && (
            <button onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shrink-0">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                tab === t.key ? "bg-sky-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
                tab === t.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-6 py-4">Code</th>
                <th className="border-b border-slate-200 px-6 py-4">Job Title</th>
                <th className="border-b border-slate-200 px-6 py-4">Department</th>
                <th className="border-b border-slate-200 px-6 py-4">Location</th>
                <th className="border-b border-slate-200 px-6 py-4">Status</th>
                <th className="border-b border-slate-200 px-6 py-4">Created</th>
                <th className="sticky right-0 z-20 border-b border-slate-200 bg-slate-50/95 px-6 py-4 text-right shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="bg-white">
              {filtered.map(pos => (
                <motion.tr key={pos.vacancyId} variants={itemVariants}
                  className="group transition-colors hover:bg-blue-50/30">

                  {/* Code */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                      {pos.vacancyCode}
                    </span>
                  </td>

                  {/* Job Title */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <p className="font-bold text-slate-900">{pos.jobTitle}</p>
                  </td>

                  {/* Department */}
                  <td className="border-b border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                    {pos.department || "—"}
                  </td>

                  {/* Location */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {[pos.branchName, pos.companyName, pos.countryName].filter(Boolean).join(" › ")}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    {pos.isFilled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600 ring-1 ring-inset ring-emerald-500/10">
                        <CheckCircle2 size={11} /> Filled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-600 ring-1 ring-inset ring-amber-500/10">
                        <Briefcase size={11} /> Vacant
                      </span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="border-b border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                    {pos.createdDate ? new Date(pos.createdDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>

                  {/* Actions */}
                  <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-6 py-4 text-right transition-colors group-hover:bg-[#f4f7fa] shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setViewTarget(pos)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-sky-500" title="View">
                        <Eye size={15} strokeWidth={2.5} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setEditTarget(pos)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500" title="Edit">
                        <Edit2 size={15} strokeWidth={2.5} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteTarget(pos)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                        <Trash2 size={15} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}

              {filtered.length === 0 && (
                <motion.tr variants={itemVariants}>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Briefcase size={40} className="mx-auto mb-4 text-slate-200" strokeWidth={1.5} />
                    <h3 className="text-sm font-black text-slate-700">No positions found</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {query ? "Try a different search term." : "Add your first position using the button above."}
                    </p>
                  </td>
                </motion.tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-right text-[11px] font-bold text-slate-400">
        Showing {filtered.length} of {positions.length} record{positions.length !== 1 ? "s" : ""}
      </p>

      {/* Modals */}
      <AnimatePresence>
        {addOpen && (
          <PositionModal mode="add" branches={branches} onClose={() => setAddOpen(false)} onSaved={fetchAll} />
        )}
        {editTarget && (
          <PositionModal mode="edit" vacancy={editTarget} branches={branches}
            onClose={() => setEditTarget(null)} onSaved={fetchAll} />
        )}
        {deleteTarget && (
          <DeleteModal vacancy={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={fetchAll} />
        )}
        {viewTarget && (
          <ViewModal vacancy={viewTarget} onClose={() => setViewTarget(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
