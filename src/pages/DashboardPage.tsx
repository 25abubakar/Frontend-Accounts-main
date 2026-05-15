import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// 1. 🌟 Normal import for motion
import { motion } from "framer-motion"; 
// 2. 🌟 Type-only import for Variants
import type { Variants } from "framer-motion"; 

import {
  Globe2, Building2, MapPin, Users, Briefcase, 
  UserCheck, UserX, Network, ArrowRight, Loader2,
  Activity, GitBranch, BarChart3, AlertCircle
} from "lucide-react";
import { orgTreeApi } from "../api/orgTreeApi";
import { positionApi } from "../api/positionApi";
import { staffApi } from "../api/staffApi";
import type { OrgNode, VacancyDto, StaffDto } from "../types";

// ── tiny animation helpers ────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, sub, i, onClick,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string; i: number; onClick?: () => void;
}) {
  return (
    <motion.div
      custom={i} variants={fadeUp} initial="hidden" animate="visible"
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 ${onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-md" : ""}`}
    >
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1.5 text-3xl font-black text-slate-800">{value}</p>
          {sub && <p className="mt-1 text-[11px] font-semibold text-slate-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color} bg-opacity-10`}>
          <Icon size={22} className={color.replace("bg-", "text-")} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Quick-link card ───────────────────────────────────────────────────────
function QuickLink({
  label, desc, icon: Icon, color, path, i,
}: {
  label: string; desc: string; icon: React.ElementType;
  color: string; path: string; i: number;
}) {
  const navigate = useNavigate();
  return (
    <motion.button
      custom={i} variants={fadeUp} initial="hidden" animate="visible"
      onClick={() => navigate(path)}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-slate-200"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-slate-800">{label}</p>
        <p className="text-[11px] font-medium text-slate-400 truncate">{desc}</p>
      </div>
      <ArrowRight size={16} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500" />
    </motion.button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [orgNodes, setOrgNodes]   = useState<OrgNode[]>([]);
  const [positions, setPositions] = useState<VacancyDto[]>([]);
  const [staff, setStaff]         = useState<StaffDto[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [nodes, pos, stf] = await Promise.all([
          orgTreeApi.getAll(),
          positionApi.getAll(),
          staffApi.getAll(),
        ]);
        setOrgNodes(nodes);
        setPositions(pos);
        setStaff(stf);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Derived stats ────────────────────────────────────────────────────────
  const countries  = orgNodes.filter(n => n.label === "Country").length;
  const companies  = orgNodes.filter(n => n.label === "Company" || n.label === "Group").length;
  const branches   = orgNodes.filter(n => n.label === "Branch").length;
  const totalSeats = positions.length;
  const filled     = positions.filter(p => p.isFilled).length;
  const vacant     = positions.filter(p => !p.isFilled).length;
  const fillRate   = totalSeats > 0 ? Math.round((filled / totalSeats) * 100) : 0;

  // Top countries by staff count
  const countryStaffMap: Record<string, number> = {};
  positions.filter(p => p.isFilled).forEach(p => {
    const c = p.countryName || "Unknown";
    countryStaffMap[c] = (countryStaffMap[c] ?? 0) + 1;
  });
  const topCountries = Object.entries(countryStaffMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top roles
  const roleMap: Record<string, number> = {};
  positions.forEach(p => {
    roleMap[p.jobTitle] = (roleMap[p.jobTitle] ?? 0) + 1;
  });
  const topRoles = Object.entries(roleMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 size={36} className="animate-spin text-[#00A3FF]" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">

      {/* ── Header ── */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible" className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-800">
          Overview
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-400">
          LAL Group Master Portal — live snapshot of your organization
        </p>
      </motion.div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <AlertCircle size={18} />
          Could not reach the server. Showing cached or empty data.
        </div>
      )}

      {/* ── KPI Stats ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard i={0} label="Countries"    value={countries}  icon={Globe2}     color="bg-blue-500"    sub="Active regions"         onClick={() => navigate("/groups/companies")} />
        <StatCard i={1} label="Companies"    value={companies}  icon={Building2}  color="bg-emerald-500" sub="Groups & entities"       onClick={() => navigate("/groups/companies")} />
        <StatCard i={2} label="Branches"     value={branches}   icon={MapPin}     color="bg-orange-500"  sub="Office locations"        onClick={() => navigate("/groups/companies")} />
        <StatCard i={3} label="Total Seats"  value={totalSeats} icon={Briefcase}  color="bg-indigo-500"  sub="Positions created"       onClick={() => navigate("/hr/vacancies")} />
        <StatCard i={4} label="Active Staff" value={filled}     icon={UserCheck}  color="bg-teal-500"    sub={`${fillRate}% fill rate`} onClick={() => navigate("/hr/staff")} />
        <StatCard i={5} label="Vacancies"    value={vacant}     icon={UserX}      color="bg-rose-500"    sub="Open seats"              onClick={() => navigate("/hr/staff/register")} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Fill Rate Bar ── */}
        <motion.div custom={6} variants={fadeUp} initial="hidden" animate="visible"
          className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-800">Seat Fill Rate</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Filled vs vacant across all positions</p>
            </div>
            <span className="rounded-xl bg-teal-50 px-3 py-1 text-sm font-black text-teal-600 border border-teal-100">
              {fillRate}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-6 h-4 w-full overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fillRate}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500"
            />
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-600">{filled} Filled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-300" />
              <span className="font-semibold text-slate-600">{vacant} Vacant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-200" />
              <span className="font-semibold text-slate-600">{totalSeats} Total</span>
            </div>
          </div>

          {/* Top countries breakdown */}
          {topCountries.length > 0 && (
            <div className="mt-6 space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Staff by Country</p>
              {topCountries.map(([country, count]) => (
                <div key={country} className="flex items-center gap-3">
                  <span className="w-28 truncate text-xs font-bold text-slate-600">{country}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((count / filled) * 100)}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-black text-slate-500">{count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Top Roles ── */}
        <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible"
          className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-1 text-base font-black text-slate-800">Top Roles</h2>
          <p className="mb-5 text-xs font-medium text-slate-400">Most common job titles</p>

          {topRoles.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium">No positions yet.</p>
          ) : (
            <div className="space-y-3">
              {topRoles.map(([role, count], idx) => (
                <div key={role} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-black text-indigo-500">
                    {idx + 1}
                  </span>
                  <span className="flex-1 truncate text-xs font-bold text-slate-700" title={role}>{role}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Org structure summary */}
          <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">Structure</p>
            {[
              { label: "Countries",  value: countries, icon: Globe2,    color: "text-blue-500" },
              { label: "Companies",  value: companies, icon: Building2, color: "text-emerald-500" },
              { label: "Branches",   value: branches,  icon: GitBranch, color: "text-orange-500" },
              { label: "Staff",      value: staff.length, icon: Users,  color: "text-indigo-500" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-500">
                  <row.icon size={13} className={row.color} />
                  {row.label}
                </div>
                <span className="font-black text-slate-700">{row.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="mt-5">
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-400">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <QuickLink i={9}  label="Companies & Entities"  desc="Browse and manage the org tree"         icon={Building2}  color="bg-emerald-500" path="/groups/companies" />
          <QuickLink i={10} label="Graphical Hierarchy"   desc="Visual org chart of all entities"       icon={Network}    color="bg-sky-500"     path="/groups/hierarchy" />
          <QuickLink i={11} label="User Registration"     desc="Register staff on open vacancies"        icon={UserCheck}  color="bg-indigo-500"  path="/groups/registration" />
          <QuickLink i={12} label="Staff Members"         desc="View and manage active employees"        icon={Users}      color="bg-teal-500"    path="/groups/staff" />
          <QuickLink i={13} label="System Analytics"      desc="Reports, traffic and engagement data"   icon={BarChart3}  color="bg-violet-500"  path="/analytics/reports" />
          <QuickLink i={14} label="Security & Access"     desc="Roles, permissions and auth logs"       icon={Activity}   color="bg-rose-500"    path="/security/roles" />
        </div>
      </motion.div>

    </div>
  );
}
