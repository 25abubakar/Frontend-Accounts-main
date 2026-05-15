import { motion } from "framer-motion";
import { Mail, Users, MapPin, Edit2, Trash2, Briefcase, User, Globe2, ChevronRight } from "lucide-react";
import type { VacancyDto } from "../types";
import { getFlag, containerVariants, itemVariants } from "../utils/orgGroupTreeDesign";

interface OrgTableProps {
  nodes: VacancyDto[];
  countryCodeMap: Record<string, string>; // countryName → ISO code e.g. "India" → "IN"
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Renders a compact breadcrumb path: Country › Company › Branch */
function PathCrumb({
  country,
  company,
  branch,
}: {
  country: string;
  company: string;
  branch: string;
}) {
  const parts = [country, company, branch].filter(p => p && p !== "—" && p !== "-");

  if (parts.length === 0) return <span className="text-slate-300">—</span>;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={10} className="text-slate-300 shrink-0" />}
          <span
            className={`text-[11px] font-semibold ${
              i === 0
                ? "text-blue-600"
                : i === 1
                ? "text-emerald-600"
                : "text-orange-500"
            }`}
          >
            {part}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function OrgTable({ nodes, countryCodeMap, onEdit, onDelete }: OrgTableProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div className="overflow-x-auto custom-scrollbar w-full">
        <table className="min-w-full text-left text-sm whitespace-nowrap border-separate border-spacing-0">

          <thead className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm text-[10px] uppercase tracking-widest text-slate-500 font-black shadow-sm">
            <tr>
              <th className="border-b border-slate-200 px-6 py-4">Employee Profile</th>
              <th className="border-b border-slate-200 px-6 py-4">Role / ID</th>
              <th className="border-b border-slate-200 px-6 py-4">Path</th>
              <th className="border-b border-slate-200 px-6 py-4">Country</th>
              <th className="border-b border-slate-200 px-6 py-4">Status</th>
              <th className="sticky right-0 z-40 border-b border-slate-200 bg-slate-50/95 px-6 py-4 text-right shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]">
                Actions
              </th>
            </tr>
          </thead>

          <motion.tbody
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="bg-white"
          >
            {nodes.map(vacancy => {
              const isFilled = vacancy.isFilled;
              const employee = vacancy.employee;

              const displayName = isFilled && employee ? employee.fullName : "Vacant Position";
              const email = isFilled && employee ? employee.email : "Awaiting Registration...";
              const roleName = vacancy.jobTitle || "Staff";

              const countryName = vacancy.countryName && vacancy.countryName !== "-" ? vacancy.countryName : "";
              const companyName = vacancy.companyName && vacancy.companyName !== "-" ? vacancy.companyName : "";
              const branchName  = vacancy.branchName  && vacancy.branchName  !== "-" ? vacancy.branchName  : "";

              // Resolve ISO code: prefer stored map, fall back to vacancyCode prefix heuristic
              const isoCode = countryName ? (countryCodeMap[countryName] ?? null) : null;

              return (
                <motion.tr
                  variants={itemVariants}
                  key={vacancy.vacancyId}
                  className="group transition-colors hover:bg-blue-50/40 relative"
                >
                  {/* ── Employee Profile ── */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ring-2 ring-white transition-all ${
                          isFilled
                            ? "bg-gradient-to-br from-[#0B1B3D] to-slate-800"
                            : "bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300"
                        }`}
                      >
                        {isFilled ? displayName.charAt(0) : <User size={18} />}
                      </div>
                      <div className="min-w-[150px]">
                        <div className={`font-bold truncate ${isFilled ? "text-slate-900" : "text-slate-500 italic"}`}>
                          {displayName}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 flex items-center mt-0.5 truncate">
                          <Mail size={10} className="mr-1.5 shrink-0" />
                          {email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ── Role / ID ── */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-500/10">
                        <Users size={12} className="mr-1.5" />
                        {roleName}
                      </span>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                        ID: {vacancy.vacancyCode}
                      </div>
                    </div>
                  </td>

                  {/* ── Path: Country › Company › Branch ── */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <PathCrumb
                      country={countryName}
                      company={companyName}
                      branch={branchName}
                    />
                    {branchName && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <MapPin size={10} className="text-orange-400 shrink-0" />
                        {branchName}
                      </div>
                    )}
                  </td>

                  {/* ── Country with real flag ── */}
                  <td className="border-b border-slate-100 px-6 py-4 text-xs font-bold text-slate-700">
                    <div className="flex items-center gap-2">
                      {isoCode ? (
                        <span className="h-4 w-6 shrink-0 overflow-hidden rounded-sm ring-1 ring-black/10 flex items-center justify-center bg-slate-100">
                          {getFlag(isoCode)}
                        </span>
                      ) : (
                        <Globe2 size={16} className="text-slate-300 shrink-0" />
                      )}
                      <span>{countryName || "—"}</span>
                    </div>
                  </td>

                  {/* ── Status ── */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ring-inset shadow-sm ${
                        isFilled
                          ? "bg-emerald-50 text-emerald-600 ring-emerald-500/20"
                          : "bg-amber-50 text-amber-600 ring-amber-500/30"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isFilled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                        }`}
                      />
                      {isFilled ? "Active" : "Vacant"}
                    </span>
                  </td>

                  {/* ── Actions ── */}
                  <td className="sticky right-0 z-20 border-b border-slate-100 bg-white group-hover:bg-[#f4f7fa] px-6 py-4 text-right transition-colors shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <motion.button
                        onClick={() => onEdit(vacancy.vacancyId)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#00A3FF]"
                      >
                        <Edit2 size={16} strokeWidth={2.5} />
                      </motion.button>
                      <motion.button
                        onClick={() => onDelete(vacancy.vacancyId)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}

            {nodes.length === 0 && (
              <motion.tr variants={itemVariants}>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <Briefcase size={40} className="mx-auto text-slate-200 mb-4" strokeWidth={1.5} />
                  <h3 className="text-sm font-black text-slate-700">No records found</h3>
                  <p className="text-xs font-medium text-slate-400 mt-1">
                    Adjust your filters or add a new position to populate this view.
                  </p>
                </td>
              </motion.tr>
            )}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}
