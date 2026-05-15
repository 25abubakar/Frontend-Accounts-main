import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Loader2, Building2, Briefcase, ArrowRightLeft, User, Mail, Phone } from "lucide-react";
import type { VacancyDto } from "../types";

export type EditTarget =
  | { type: "Entity"; id: number; name: string; code: string | null; label: string }
  | {
      type: "Position";
      id: string;
      jobTitle: string;
      department: string;
      countryName: string | null;
      companyName: string | null;
      isLegacy?: boolean;
      employee?: {
        staffId: string;
        fullName: string;
        email: string;
        phone: string;
      } | null;
    };

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: EditTarget | null;
  openVacancies: VacancyDto[];
  onSubmitEntity: (id: number, data: { name: string; code: string | null }) => Promise<void>;
  onSubmitPosition: (id: string, data: { jobTitle: string; department: string }) => Promise<void>;
  onSubmitEmployee: (staffId: string, data: { fullName: string; email: string; phone: string }) => Promise<void>;
  onTransferStaff: (staffId: string, newVacancyId: string) => Promise<void>;
}

const generateCode = (name: string) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").substring(0, 3).toUpperCase();
};

type Tab = "details" | "employee" | "transfer";

export default function EditRecordModal({
  isOpen, onClose, target, openVacancies,
  onSubmitEntity, onSubmitPosition, onSubmitEmployee, onTransferStaff
}: EditRecordModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("details");

  // --- Position / Entity fields ---
  const [nameOrTitle, setNameOrTitle] = useState("");
  const [codeOrDept, setCodeOrDept] = useState("");

  // --- Employee personal fields ---
  const [empFullName, setEmpFullName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");

  // --- Transfer field ---
  const [selectedTransferVacancy, setSelectedTransferVacancy] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && target) {
      setError(null);
      setSuccessMsg(null);
      setActiveTab("details");
      setSelectedTransferVacancy("");

      if (target.type === "Entity") {
        setNameOrTitle(target.name);
        setCodeOrDept(target.code || "");
      } else {
        setNameOrTitle(target.jobTitle);
        setCodeOrDept(target.department || "");
        // Pre-fill employee fields if a person is assigned
        if (target.employee) {
          setEmpFullName(target.employee.fullName);
          setEmpEmail(target.employee.email);
          setEmpPhone(target.employee.phone);
        } else {
          setEmpFullName("");
          setEmpEmail("");
          setEmpPhone("");
        }
      }
    }
  }, [isOpen, target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      if (target.type === "Entity") {
        if (!nameOrTitle.trim()) throw new Error("Entity Name is required.");
        await onSubmitEntity(target.id, {
          name: nameOrTitle.trim(),
          code: codeOrDept.trim() || null,
        });

      } else if (activeTab === "details") {
        if (!nameOrTitle.trim()) throw new Error("Job Title is required.");
        await onSubmitPosition(target.id, {
          jobTitle: nameOrTitle.trim(),
          department: codeOrDept.trim(),
        });

      } else if (activeTab === "employee" && target.employee) {
        if (!empFullName.trim()) throw new Error("Full name is required.");
        if (!empEmail.trim()) throw new Error("Email is required.");
        await onSubmitEmployee(target.employee.staffId, {
          fullName: empFullName.trim(),
          email: empEmail.trim(),
          phone: empPhone.trim(),
        });

      } else if (activeTab === "transfer" && target.employee) {
        if (!selectedTransferVacancy) throw new Error("Please select a destination position.");
        await onTransferStaff(target.employee.staffId, selectedTransferVacancy);
      }

      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        "Something went wrong.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!target) return null;

  const isEntity = target.type === "Entity";
  const hasEmployee = !isEntity && !!(target as any).employee;
  const isLegacy = !isEntity && !!(target as any).isLegacy;

  const Icon = isEntity ? Building2 : Briefcase;
  const colorTheme = isEntity ? "text-emerald-500" : "text-[#00A3FF]";
  const bgTheme = isEntity ? "bg-emerald-50 ring-emerald-100" : "bg-sky-50 ring-sky-100";

  const validTransferOptions = !isEntity
    ? openVacancies.filter(
        v =>
          v.countryName === (target as any).countryName &&
          v.companyName === (target as any).companyName
      )
    : [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "details", label: "Role Details", icon: <Edit2 size={13} /> },
    ...(hasEmployee && !isLegacy
      ? [
          { id: "employee" as Tab, label: "Employee", icon: <User size={13} /> },
          { id: "transfer" as Tab, label: "Transfer", icon: <ArrowRightLeft size={13} /> },
        ]
      : []),
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            {/* Header */}
            <div className="mb-5 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-inner ring-1 ${bgTheme}`}>
                  <Icon className={colorTheme} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-800">
                    Edit {isEntity ? "Entity" : "Position"}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                    {isEntity ? (target as any).label : "System Role"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            {/* Error / Success banners */}
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm font-semibold text-emerald-600">
                {successMsg}
              </div>
            )}

            {/* Legacy warning */}
            {isLegacy && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-700">
                <h4 className="font-black text-sm mb-1">⚠️ Legacy Record</h4>
                <p className="text-xs font-medium leading-relaxed">
                  This record belongs to the old system and cannot be edited here. Delete it and re-register the employee via the Registration portal.
                </p>
              </div>
            )}

            {/* Tab bar — only shown for filled positions */}
            {hasEmployee && !isLegacy && (
              <div className="mb-5 flex rounded-xl bg-slate-100 p-1 shadow-inner ring-1 ring-slate-200/50">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id); setError(null); }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-black uppercase tracking-wider transition-all ${
                      activeTab === tab.id
                        ? tab.id === "transfer"
                          ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                          : tab.id === "employee"
                          ? "bg-white text-sky-600 shadow-sm ring-1 ring-black/5"
                          : "bg-white text-slate-800 shadow-sm ring-1 ring-black/5"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* ── TAB: ROLE DETAILS ── */}
              {activeTab === "details" && !isLegacy && (
                <motion.div key="details" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      {isEntity ? "Entity Name" : "Job Title"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={nameOrTitle}
                      onChange={e => {
                        const v = e.target.value;
                        setNameOrTitle(v);
                        if (isEntity) setCodeOrDept(generateCode(v));
                      }}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      {isEntity ? "System Code (Optional)" : "Department"}
                    </label>
                    <input
                      type="text"
                      value={codeOrDept}
                      onChange={e => setCodeOrDept(e.target.value)}
                      className={`w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 ${isEntity ? "uppercase" : ""}`}
                    />
                  </div>
                </motion.div>
              )}

              {/* ── TAB: EMPLOYEE PERSONAL DETAILS ── */}
              {activeTab === "employee" && !isEntity && hasEmployee && !isLegacy && (
                <motion.div key="employee" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

                  {/* Avatar row */}
                  <div className="flex items-center gap-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-500 text-lg font-black text-white shadow-inner ring-4 ring-sky-100">
                      {empFullName ? empFullName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{empFullName || "—"}</p>
                      <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                        {(target as any).jobTitle}
                      </p>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <User size={13} className="text-slate-400" /> Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={empFullName}
                      onChange={e => setEmpFullName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <Mail size={13} className="text-slate-400" /> Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={empEmail}
                      onChange={e => setEmpEmail(e.target.value)}
                      placeholder="john.doe@company.com"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                      <Phone size={13} className="text-slate-400" /> Phone
                    </label>
                    <input
                      type="tel"
                      value={empPhone}
                      onChange={e => setEmpPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10"
                    />
                  </div>
                </motion.div>
              )}

              {/* ── TAB: TRANSFER ── */}
              {activeTab === "transfer" && !isEntity && hasEmployee && !isLegacy && (
                <motion.div key="transfer" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-lg font-black text-white shadow-inner ring-4 ring-indigo-100">
                      {(target as any).employee.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800">{(target as any).employee.fullName}</h4>
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                        <Briefcase size={12} className="text-indigo-400" /> Currently: {(target as any).jobTitle}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                      Transfer To <span className="text-red-500">*</span>
                    </label>
                    <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 p-2 text-[10px] font-bold text-amber-600">
                      Restricted to [{(target as any).companyName}] in [{(target as any).countryName}]
                    </div>
                    <select
                      value={selectedTransferVacancy}
                      onChange={e => setSelectedTransferVacancy(e.target.value)}
                      className="w-full cursor-pointer rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                    >
                      <option value="" disabled>Select destination...</option>
                      {validTransferOptions.length === 0 ? (
                        <option disabled>No open vacancies available.</option>
                      ) : (
                        validTransferOptions.map(v => (
                          <option key={v.vacancyId} value={v.vacancyId}>
                            {v.branchName !== "—" ? v.branchName : "Main"} — {v.jobTitle} ({v.vacancyCode})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </motion.div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  {isLegacy ? "Close" : "Cancel"}
                </button>

                {!isLegacy && (
                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (activeTab === "transfer" && !selectedTransferVacancy)
                    }
                    className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors disabled:opacity-50 ${
                      activeTab === "transfer"
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : activeTab === "employee"
                        ? "bg-sky-600 hover:bg-sky-700"
                        : "bg-slate-800 hover:bg-black"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : activeTab === "transfer" ? (
                      <ArrowRightLeft size={16} />
                    ) : activeTab === "employee" ? (
                      <User size={16} />
                    ) : (
                      <Edit2 size={16} />
                    )}
                    {activeTab === "transfer"
                      ? "Execute Transfer"
                      : activeTab === "employee"
                      ? "Save Employee"
                      : "Save Changes"}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
