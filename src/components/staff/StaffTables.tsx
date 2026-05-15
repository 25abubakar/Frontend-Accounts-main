import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Mail, Phone, Edit2, Trash2, MapPin, ArrowRightLeft, UserMinus, Eye, CheckCircle2, ExternalLink } from "lucide-react";
import type { StaffDto } from "../../types";
import type { PersonDto } from "../../api/personsApi";
import { containerVariants, itemVariants } from "../../utils/orgGroupTreeDesign";

export function StaffAvatar({ staff, size = 10 }: { staff: StaffDto; size?: number }) {
  const s = `h-${size} w-${size}`;
  if (staff.photoUrl) {
    return <img src={staff.photoUrl} alt={staff.fullName} className={`${s} rounded-full object-cover ring-2 ring-white shadow-sm`} />;
  }
  return (
    <div className={`${s} flex items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 font-black text-white shadow-sm ring-2 ring-white`}>
      {staff.fullName.charAt(0).toUpperCase()}
    </div>
  );
}

export function PersonAvatar({ person, size = 10 }: { person: PersonDto; size?: number }) {
  const s = `h-${size} w-${size}`;
  if (person.photoUrl) {
    return <img src={person.photoUrl} alt={person.fullName} className={`${s} rounded-full object-cover ring-2 ring-white shadow-sm`} />;
  }
  return (
    <div className={`${s} flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-sm ring-2 ring-white`}>
      {person.fullName.charAt(0).toUpperCase()}
    </div>
  );
}

interface StaffTableProps {
  staff: StaffDto[];
  onEdit: (s: StaffDto) => void;
  onFire: (s: StaffDto) => void;
  onTransfer: (s: StaffDto) => void;
}

export const StaffTable = React.memo(function StaffTable({ staff, onEdit, onFire, onTransfer }: StaffTableProps) {
  if (staff.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm text-center">
        <Users size={48} className="text-slate-200 mb-4" strokeWidth={1.5} />
        <h3 className="text-sm font-black text-slate-700">No staff members found</h3>
        <p className="mt-1 text-xs font-medium text-slate-400">Hire persons to positions to see them here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
          {/* 🌟 Enhanced visible header that stays strictly fixed */}
          <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-sm">
            <tr>
              <th className="border-b border-slate-200 px-6 py-4">Employee</th>
              <th className="border-b border-slate-200 px-6 py-4">Contact</th>
              <th className="border-b border-slate-200 px-6 py-4">Role</th>
              <th className="border-b border-slate-200 px-6 py-4">Department</th>
              <th className="border-b border-slate-200 px-6 py-4">Branch</th>
              <th className="border-b border-slate-200 px-6 py-4">Joined</th>
              <th className="sticky right-0 z-30 border-b border-slate-200 bg-slate-100 px-6 py-4 text-right shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]">Actions</th>
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="bg-white">
            {staff.map(s => (
              <motion.tr key={s.staffId} variants={itemVariants} className="group transition-colors hover:bg-blue-50/30">
                <td className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <StaffAvatar staff={s} size={9} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate max-w-[160px]">{s.fullName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{s.vacancyCode}</span>
                        {s.loginId && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                            <span className="text-indigo-400">ID:</span> {s.loginId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-6 py-4">
                  <div className="space-y-0.5">
                    {s.email && <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Mail size={11} className="text-slate-400 shrink-0" /><span className="truncate max-w-[160px]">{s.email}</span></div>}
                    {s.phone && <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Phone size={11} className="text-slate-400 shrink-0" />{s.phone}</div>}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-6 py-4"><p className="font-semibold text-slate-700 truncate max-w-[140px]">{s.jobTitle}</p></td>
                <td className="border-b border-slate-100 px-6 py-4">
                  {s.department ? <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 ring-1 ring-inset ring-sky-500/10">{s.department}</span> : <span className="text-xs font-semibold text-slate-300">—</span>}
                </td>
                <td className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={11} className="text-slate-400 shrink-0" /><span className="truncate max-w-[160px]">{[s.branchName, s.companyName, s.countryName].filter(Boolean).join(" › ")}</span></div>
                </td>
                <td className="border-b border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                  {s.joiningDate ? new Date(s.joiningDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                </td>
                <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-6 py-4 text-right transition-colors group-hover:bg-[#f4f7fa] shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(s)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500" title="Edit"><Edit2 size={15} strokeWidth={2.5} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onTransfer(s)} className="rounded-lg p-2 text-slate-400 hover:bg-amber-50 hover:text-amber-500" title="Transfer"><ArrowRightLeft size={15} strokeWidth={2.5} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onFire(s)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Fire"><UserMinus size={15} strokeWidth={2.5} /></motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
});

interface PersonsTableProps {
  persons: PersonDto[];
  onView: (p: PersonDto) => void;
  onEdit: (p: PersonDto) => void;
  onDelete: (p: PersonDto) => void;
}

export const PersonsTable = React.memo(function PersonsTable({ persons, onView, onEdit, onDelete }: PersonsTableProps) {
  const navigate = useNavigate();
  if (persons.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm text-center">
        <Users size={48} className="text-slate-200 mb-4" strokeWidth={1.5} />
        <h3 className="text-sm font-black text-slate-700">No persons found</h3>
        <p className="mt-1 text-xs font-medium text-slate-400">Register persons to see them here.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm whitespace-nowrap">
          {/* 🌟 Enhanced visible header that stays strictly fixed */}
          <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-sm">
            <tr>
              <th className="border-b border-slate-200 px-6 py-4">Person</th>
              <th className="border-b border-slate-200 px-6 py-4">Login ID</th>
              <th className="border-b border-slate-200 px-6 py-4">Gender</th>
              <th className="border-b border-slate-200 px-6 py-4">City</th>
              <th className="border-b border-slate-200 px-6 py-4">Contact</th>
              <th className="border-b border-slate-200 px-6 py-4">Status</th>
              <th className="sticky right-0 z-30 border-b border-slate-200 bg-slate-100 px-6 py-4 text-right shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]">Actions</th>
            </tr>
          </thead>
          <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="bg-white">
            {persons.map(p => (
              <motion.tr key={p.personId} variants={itemVariants} className="group transition-colors hover:bg-indigo-50/20">
                <td className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <PersonAvatar person={p} size={9} />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate max-w-[160px]">{p.fullName}</p>
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-black text-indigo-600 ring-1 ring-inset ring-indigo-500/10 mt-0.5">
                        <span className="text-indigo-400">ID:</span> {p.loginId}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-6 py-4">
                  <button onClick={() => navigator.clipboard?.writeText(p.loginId)} title="Click to copy" className="group inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 transition-colors">
                    <span className="text-xs font-black text-slate-700 group-hover:text-indigo-700 font-mono">{p.loginId}</span>
                  </button>
                </td>
                <td className="border-b border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">{p.gender || "—"}</td>
                <td className="border-b border-slate-100 px-6 py-4">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin size={11} className="text-slate-400 shrink-0" />{p.currentAddress?.city || "—"}</div>
                </td>
                <td className="border-b border-slate-100 px-6 py-4">
                  <div className="space-y-0.5">
                    {p.phone && <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Phone size={11} className="text-slate-400 shrink-0" />{p.phone}</div>}
                    {p.email && <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Mail size={11} className="text-slate-400 shrink-0" /><span className="truncate max-w-[140px]">{p.email}</span></div>}
                  </div>
                </td>
                <td className="border-b border-slate-100 px-6 py-4">
                  {p.isHired ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600 ring-1 ring-inset ring-emerald-500/10"><CheckCircle2 size={11} /> Hired</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-inset ring-slate-300/30"><Users size={11} /> Not Hired</span>
                  )}
                </td>
                <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-6 py-4 text-right transition-colors group-hover:bg-[#f5f4ff] shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onView(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-sky-500" title="Quick View"><Eye size={15} strokeWidth={2.5} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(`/hr/staff/${p.personId}`)} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500" title="Full Profile"><ExternalLink size={15} strokeWidth={2.5} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onEdit(p)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500" title="Edit"><Edit2 size={15} strokeWidth={2.5} /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => onDelete(p)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Delete"><Trash2 size={15} strokeWidth={2.5} /></motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
});