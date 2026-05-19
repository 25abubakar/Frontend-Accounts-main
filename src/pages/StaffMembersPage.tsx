import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Search, Globe2, ChevronDown, Briefcase, Users, UserPlus, AlertCircle, X, Loader2 } from "lucide-react";

import { staffApi } from "../api/staffApi";
import { personsApi, type PersonDto } from "../api/personsApi";
import type { StaffDto } from "../types";
import { useAuth } from "../context/AuthContext";
import { PERMISSIONS } from "../lib/permissions";

import { StaffTable, PersonsTable } from "../components/staff/StaffTables";
import { FireModal, TransferModal, DeletePersonModal, ViewPersonModal, EditStaffModal, EditPersonModal } from "../components/staff/StaffModals";
import Can from "../components/shared/Can";
import { FEATURE } from "../lib/featureKeys";

type MainTab = "staff" | "persons";

export default function StaffMembersPage() {
  const navigate = useNavigate();
  const { accessibleData, hasPermission, hasAnyPermission } = useAuth();

  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [personsList, setPersonsList] = useState<PersonDto[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingPersons, setLoadingPersons] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<MainTab>("staff");
  const [query, setQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const [fireStaff, setFireStaff] = useState<StaffDto | null>(null);
  const [transferStaff, setTransferStaff] = useState<StaffDto | null>(null);
  const [viewPerson, setViewPerson] = useState<PersonDto | null>(null);
  const [deletePerson, setDeletePerson] = useState<PersonDto | null>(null);

  // 🌟 State for the New Edit Form
  const [editStaff, setEditStaff] = useState<StaffDto | null>(null);
  const [editPerson, setEditPerson] = useState<PersonDto | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      // Use accessible data if available, otherwise fetch from API
      if (accessibleData.staff.length > 0) {
        setStaffList(accessibleData.staff);
      } else {
        const data = await staffApi.getAll();
        setStaffList(data);
      }
    } catch {
      setApiError("Unable to load staff data.");
    } finally { setLoadingStaff(false); }
  }, [accessibleData.staff]);

  const fetchPersons = useCallback(async () => {
    try {
      setLoadingPersons(true);
      // Use accessible data if available, otherwise fetch from API
      if (accessibleData.persons.length > 0) {
        setPersonsList(accessibleData.persons);
      } else {
        const data = await personsApi.getAll();
        setPersonsList(data);
      }
    } catch {
      setApiError("Unable to load persons data.");
    } finally { setLoadingPersons(false); }
  }, [accessibleData.persons]);

  useEffect(() => {
    fetchStaff();
    fetchPersons();
  }, [fetchStaff, fetchPersons]);

  const staffCountries = Array.from(new Set(staffList.map(s => s.countryName).filter(Boolean) as string[])).sort();
  const personCountries = Array.from(new Set(personsList.map(p => p.currentAddress?.country).filter(Boolean) as string[])).sort();
  const allCountries = Array.from(new Set([...staffCountries, ...personCountries])).sort();

  const filteredStaff = staffList.filter(s => {
    const q = query.toLowerCase();
    const matchSearch = !q || s.fullName.toLowerCase().includes(q) || s.jobTitle.toLowerCase().includes(q) || (s.department ?? "").toLowerCase().includes(q) || (s.branchName ?? "").toLowerCase().includes(q) || (s.vacancyCode ?? "").toLowerCase().includes(q);
    const matchCountry = !countryFilter || (s.countryName ?? "") === countryFilter;
    return matchSearch && matchCountry;
  });

  const filteredPersons = personsList.filter(p => {
    if (p.isHired) return false;
    const q = query.toLowerCase();
    const matchSearch = !q || p.fullName.toLowerCase().includes(q) || p.loginId.toLowerCase().includes(q) || (p.currentAddress?.city ?? "").toLowerCase().includes(q) || (p.phone ?? "").toLowerCase().includes(q);
    const matchCountry = !countryFilter || (p.currentAddress?.country ?? "") === countryFilter;
    return matchSearch && matchCountry;
  });

  const isLoading = activeTab === "staff" ? loadingStaff : loadingPersons;

  return (
    <div className="h-full w-full flex flex-col bg-[#F8FAFC] p-5 lg:p-8 overflow-hidden">
      
      <div className="shrink-0 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Staff & Persons</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-400">
            {staffList.length} hired employee{staffList.length !== 1 ? "s" : ""} · {personsList.filter(p => !p.isHired).length} not yet assigned
          </p>
        </div>
        <Can permission={FEATURE.PERSON_REGISTER}>
          <button onClick={() => navigate("/hr/staff/register")} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all">
            <UserPlus size={16} /> Register Person
          </button>
        </Can>
      </div>

      {apiError && (
        <div className="shrink-0 mb-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <AlertCircle size={16} className="shrink-0" />
          {apiError}
          <button onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={15} /></button>
        </div>
      )}

      <div className="shrink-0 mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={activeTab === "staff" ? "Search by name, role, branch, code…" : "Search by name, login ID, city, phone…"}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm font-semibold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10"
          />
          {query && <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>}
        </div>

        <div className="relative shrink-0">
          <Globe2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-9 text-sm font-semibold text-slate-700 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 min-w-[160px]">
            <option value="">All Countries</option>
            {allCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shrink-0">
          <button onClick={() => { setActiveTab("staff"); setQuery(""); }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === "staff" ? "bg-sky-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <Briefcase size={13} /> Staff <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === "staff" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{staffList.length}</span>
          </button>
          <button onClick={() => { setActiveTab("persons"); setQuery(""); }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${activeTab === "persons" ? "bg-indigo-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>
            <Users size={13} /> Persons <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${activeTab === "persons" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{personsList.filter(p => !p.isHired).length}</span>
          </button>
        </div>
      </div>

      {countryFilter && (
        <div className="shrink-0 mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 ring-1 ring-inset ring-sky-500/10">
            <Globe2 size={11} /> {countryFilter}
            <button onClick={() => setCountryFilter("")} className="ml-1 text-sky-400 hover:text-sky-700"><X size={11} /></button>
          </span>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        {isLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 size={36} className={`animate-spin ${activeTab === "staff" ? "text-sky-500" : "text-indigo-500"}`} />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === "staff" ? (
              <motion.div key="staff" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="absolute inset-0 flex flex-col">
                <StaffTable staff={filteredStaff} onEdit={setEditStaff} onFire={setFireStaff} onTransfer={setTransferStaff} />
                <p className="shrink-0 mt-3 text-right text-[11px] font-bold text-slate-400">
                  Showing {filteredStaff.length} of {staffList.length} employee{staffList.length !== 1 ? "s" : ""}
                </p>
              </motion.div>
            ) : (
              <motion.div key="persons" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="absolute inset-0 flex flex-col">
                <PersonsTable persons={filteredPersons} onView={setViewPerson} onEdit={setEditPerson} onDelete={setDeletePerson} />
                <p className="shrink-0 mt-3 text-right text-[11px] font-bold text-slate-400">
                  Showing {filteredPersons.length} not-hired person{filteredPersons.length !== 1 ? "s" : ""}
                  {" · "}
                  {personsList.filter(p => p.isHired).length} already in Staff
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {editStaff && <EditStaffModal staff={editStaff} onClose={() => setEditStaff(null)} onSaved={fetchStaff} />}
        {editPerson && <EditPersonModal person={editPerson} onClose={() => setEditPerson(null)} onSaved={fetchPersons} />}

        {fireStaff && <FireModal staff={fireStaff} onClose={() => setFireStaff(null)} onFired={() => { fetchStaff(); fetchPersons(); }} />}
        {transferStaff && <TransferModal staff={transferStaff} onClose={() => setTransferStaff(null)} onTransferred={fetchStaff} />}
        {viewPerson && <ViewPersonModal person={viewPerson} onClose={() => setViewPerson(null)} />}
        {deletePerson && <DeletePersonModal person={deletePerson} onClose={() => setDeletePerson(null)} onDeleted={fetchPersons} />}
      </AnimatePresence>
    </div>
  );
}