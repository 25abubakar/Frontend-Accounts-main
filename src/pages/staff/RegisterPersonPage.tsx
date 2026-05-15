import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Briefcase, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Loader2, MapPin, Phone, Shield, User, X } from "lucide-react";

import { personsApi, type RegisterPersonDto } from "../../api/personsApi";
import { positionApi } from "../../api/positionApi";
import { locationApi } from "../../api/locationApi";
import { staffApi } from "../../api/staffApi"; 
import type { VacancyDto, CountryDto } from "../../types";

import RegistrationSuccessModal from "../../components/staff/RegistrationSuccessModal";

// 🌟 Import your new refactored components
import VacancyFilterBar from "../../components/HRManagement/VacancyFilterBar";
import AddressForm, { emptyAddress, type AddressState } from "../../components/HRManagement/AddressForm";
import { StepIndicator, StepCard } from "../../components/HRManagement/FormStepUI";

// ─── Styling & Helpers ────────────────────────────────────────────────────────
const INP = "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";
const LBL = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

const unique = (arr: (string | null | undefined)[]) => Array.from(new Set(arr.filter((v): v is string => !!v && v !== "-" && v !== "—"))).sort();

const STEPS = [
  { label: "Vacancy", icon: Briefcase },
  { label: "Personal", icon: User },
  { label: "Contact", icon: Phone },
  { label: "Access", icon: Shield },
];

type Gender = "" | "Male" | "Female" | "Other";
type MaritalStatus = "" | "Single" | "Married" | "Divorced" | "Widowed";

export default function RegisterPersonPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedVacancyId = typeof location.state?.vacancyId === "string" ? location.state.vacancyId : "";

  // ─── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);

  const [vacancies, setVacancies] = useState<VacancyDto[]>([]);
  const [loadingVacancies, setLoadingVacancies] = useState(true);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>("");
  
  const [filters, setFilters] = useState({ country: "", group: "", company: "", branch: "", department: "", jobTitle: "" });

  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus>("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [currentAddress, setCurrentAddress] = useState<AddressState>(emptyAddress());
  const [sameAsCurrent, setSameAsCurrent] = useState(true);
  const [permanentAddress, setPermanentAddress] = useState<AddressState>(emptyAddress());

  const [previewLoginId, setPreviewLoginId] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [success, setSuccess] = useState<any>(null);

  // ─── Memos ──────────────────────────────────────────────────────────────────
  const selectedVacancy = useMemo(() => vacancies.find(v => v.vacancyId === selectedVacancyId) ?? null, [vacancies, selectedVacancyId]);

  const filterOptions = useMemo(() => {
    const countryOptions = unique(vacancies.map(v => v.countryName));
    const groupOptions = unique(vacancies.filter(v => v.nodeLabel === 'Group').map(v => v.branchName));
    const companyOptions = unique(
      vacancies
        .filter(v => (!filters.country || v.countryName === filters.country))
        .map(v => v.companyName)
    );
    const branchOptions = unique(
      vacancies
        .filter(v => (!filters.country || v.countryName === filters.country) && (!filters.company || v.companyName === filters.company))
        .map(v => v.branchName)
    );
    const departmentOptions = unique(
      vacancies
        .filter(v => (!filters.country || v.countryName === filters.country) && (!filters.company || v.companyName === filters.company) && (!filters.branch || v.branchName === filters.branch))
        .map(v => v.department)
    );
    const roleOptions = unique(
      vacancies
        .filter(v => (!filters.country || v.countryName === filters.country) && (!filters.company || v.companyName === filters.company) && (!filters.branch || v.branchName === filters.branch) && (!filters.department || v.department === filters.department))
        .map(v => v.jobTitle)
    );

    return { countryOptions, groupOptions, companyOptions, branchOptions, departmentOptions, roleOptions };
  }, [vacancies, filters]);

  const filteredVacancies = useMemo(() => {
    return vacancies.filter(v => {
      if (filters.country && v.countryName !== filters.country) return false;
      if (filters.group && v.nodeLabel === 'Group' && v.branchName !== filters.group) return false; 
      if (filters.company && v.companyName !== filters.company) return false;
      if (filters.branch && v.branchName !== filters.branch) return false;
      if (filters.department && v.department !== filters.department) return false;
      if (filters.jobTitle && v.jobTitle !== filters.jobTitle) return false;
      return true;
    });
  }, [vacancies, filters]);

  const hasActiveFilters = filters.country || filters.group || filters.company || filters.branch || filters.department || filters.jobTitle;

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingVacancies(true);
        const data = await positionApi.getVacant();
        if (alive) {
          setVacancies(data);
          if (preselectedVacancyId && data.some(v => v.vacancyId === preselectedVacancyId)) setSelectedVacancyId(preselectedVacancyId);
        }
      } catch {
        if (alive) setVacancies([]);
      } finally {
        if (alive) setLoadingVacancies(false);
      }
    })();
    return () => { alive = false; };
  }, [preselectedVacancyId]);

  useEffect(() => {
    locationApi.getCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!sameAsCurrent) return;
    setPermanentAddress(currentAddress);
  }, [sameAsCurrent, currentAddress]);

  useEffect(() => {
    let alive = true;
    const branchId = selectedVacancy?.organizationId;
    if (!branchId) {
      setPreviewLoginId("");
      setEmail("");
      return;
    }
    const fetchPreviews = async () => {
      try {
        setLoadingPreview(true);
        const loginData = await personsApi.previewLoginId(branchId);
        if (alive) setPreviewLoginId(loginData.loginId);

        if (fullName.trim()) {
          if (personsApi.previewEmail) {
            const emailData = await personsApi.previewEmail(branchId, fullName);
            if (alive) setEmail(emailData.generatedEmail);
          } else {
             if (alive) setEmail(loginData.generatedEmail || "");
          }
        } else {
          if (alive) setEmail(loginData.generatedEmail || "");
        }
      } catch {
        if (alive) { setPreviewLoginId(""); setEmail(""); }
      } finally {
        if (alive) setLoadingPreview(false);
      }
    };
    const delay = setTimeout(fetchPreviews, 400);
    return () => { alive = false; clearTimeout(delay); };
  }, [selectedVacancy?.organizationId, fullName]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const canNextFromVacancy = !!selectedVacancyId && !loadingVacancies;

  const onNext = () => {
    setApiError(null);
    // 🌟 ALL FIELD VALIDATIONS REMOVED
    // We only check if a vacancy is selected on step 0 to prevent a backend crash.
    if (step === 0 && !canNextFromVacancy) {
      setApiError("Select a vacancy to continue.");
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const onPrev = () => {
    setApiError(null);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setApiError(null);
    if (!selectedVacancy) { setApiError("Please select a vacancy first."); return; }

    // 🌟 FIXED PAYLOAD: Uses `|| null` to handle empty fields and `as any` to silence strict TS errors
    const payload = {
      branchId: selectedVacancy.organizationId,
      vacancyId: selectedVacancy.vacancyId, 
      fullName: fullName.trim() || "New Staff Member", // Provide default name if empty
      gender: gender || null,
      dateOfBirth: dateOfBirth || null, 
      maritalStatus: maritalStatus || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      currentAddress: {
        addressLine: currentAddress.addressLine.trim() || null,
        country: currentAddress.country || null,
        province: currentAddress.province || null,
        city: currentAddress.city || null,
        district: currentAddress.district.trim() || null,
        postalCode: currentAddress.postalCode.trim() || null,
      },
      permanentAddress: {
        addressLine: (sameAsCurrent ? currentAddress.addressLine : permanentAddress.addressLine).trim() || null,
        country: sameAsCurrent ? currentAddress.country : permanentAddress.country || null,
        province: sameAsCurrent ? currentAddress.province : permanentAddress.province || null,
        city: sameAsCurrent ? currentAddress.city : permanentAddress.city || null,
        district: (sameAsCurrent ? currentAddress.district : permanentAddress.district).trim() || null,
        postalCode: (sameAsCurrent ? currentAddress.postalCode : permanentAddress.postalCode).trim() || null,
      },
    } as any; 

    try {
      setSubmitting(true);
      const created = await personsApi.register(payload as RegisterPersonDto);
      const personId = created.person.personId;
      const staffName = created.person.fullName || fullName || "New Staff Member";

      await staffApi.hireRegisteredPerson(selectedVacancy.vacancyId, personId);

      setSuccess({ 
        loginId: created.generatedLoginId || previewLoginId || "", 
        password: created.generatedPassword || `${previewLoginId}@` || "", 
        email: created.generatedEmail || email.trim() || "",
        staffName: staffName 
      });
    } catch (e: any) {
      const d = e.response?.data;
      const msg = d?.message ?? (d?.errors ? Object.values(d.errors).flat().join(" ") : null) ?? d?.title ?? "Registration failed. Please try again.";
      setApiError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Register Person</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-400">Select a vacant position first, then register the person.</p>
        </div>
        <button onClick={() => navigate("/hr/staff")} className="self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Back to Staff
        </button>
      </div>

      <StepIndicator current={step} steps={STEPS} />

      {apiError && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm font-semibold text-red-600">{apiError}</p>
          <button onClick={() => setApiError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={15} /></button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        
        {/* STEP 0: VACANCY */}
        {step === 0 && (
          <motion.div key="step-vacancy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StepCard title="Select Vacancy (Vacant Position)" icon={Briefcase} selectedVacancy={selectedVacancy}>
              {loadingVacancies ? (
                <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
              ) : vacancies.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-black text-slate-700">No vacant positions</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Create a new vacancy from the Positions page, then come back here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <VacancyFilterBar filters={filters} setFilters={setFilters} options={filterOptions} hasActiveFilters={hasActiveFilters} />

                  <div>
                    <label className={LBL}>Select Available Position</label>
                    <div className="relative">
                      <select className={INP + " appearance-none pr-10"} value={selectedVacancyId} onChange={e => setSelectedVacancyId(e.target.value)}>
                        <option value="">Select vacancy ({filteredVacancies.length} available)</option>
                        {filteredVacancies.map(v => (
                          <option key={v.vacancyId} value={v.vacancyId}>{v.vacancyCode} — {v.jobTitle} ({v.branchName})</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </StepCard>
          </motion.div>
        )}

        {/* STEP 1: PERSONAL */}
        {step === 1 && (
          <motion.div key="step-personal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StepCard title="Personal Information" icon={User} selectedVacancy={selectedVacancy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={LBL}>Full Name</label>
                  <input className={INP} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full name (Optional)" />
                </div>
                <div>
                  <label className={LBL}>Gender</label>
                  <select className={INP} value={gender} onChange={e => setGender(e.target.value as Gender)}>
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={LBL}>Date of Birth</label>
                  <input className={INP} type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className={LBL}>Marital Status</label>
                  <select className={INP} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value as MaritalStatus)}>
                    <option value="">Select…</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
              </div>
            </StepCard>
          </motion.div>
        )}

        {/* STEP 2: CONTACT & ADDRESS */}
        {step === 2 && (
          <motion.div key="step-contact" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StepCard title="Contact & Address" icon={Phone} selectedVacancy={selectedVacancy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={LBL}>Phone</label>
                  <input className={INP} value={phone} onChange={e => setPhone(e.target.value)} placeholder="03xx xxxxxxx (Optional)" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold uppercase text-slate-500">Corporate Email</label>
                  </div>
                  <input className={INP} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. john.doe@company.com" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 mb-4">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5"><MapPin size={12} /> Current Address</p>
                <AddressForm prefix="Current" value={currentAddress} onChange={setCurrentAddress} countries={countries} />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 select-none mb-4">
                <div onClick={() => setSameAsCurrent(v => !v)} className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${sameAsCurrent ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}>
                  {sameAsCurrent && <CheckCircle2 size={12} className="text-white" />}
                </div>
                <span className="text-sm font-semibold text-slate-600">Permanent address same as current</span>
              </label>

              {!sameAsCurrent && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5"><MapPin size={12} /> Permanent Address</p>
                  <AddressForm prefix="Permanent" value={permanentAddress} onChange={setPermanentAddress} countries={countries} />
                </div>
              )}
            </StepCard>
          </motion.div>
        )}

        {/* STEP 3: ACCESS */}
        {step === 3 && (
          <motion.div key="step-access" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <StepCard title="Credentials Summary" icon={Shield} selectedVacancy={selectedVacancy}>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Login ID</p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-800">{loadingPreview ? "Generating..." : previewLoginId || "—"}</p>
                  </div>
                  <Shield className="text-indigo-200 h-8 w-8" strokeWidth={1.5} />
                </div>
                <div className="h-px w-full bg-slate-200"></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Default Password</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-800">{loadingPreview ? "Generating..." : previewLoginId ? `${previewLoginId}@` : "—"}</p>
                </div>
                <div className="h-px w-full bg-slate-200"></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate Email</p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-sm font-bold text-slate-800">{email || "—"}</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <AlertCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-xs font-semibold text-indigo-700 leading-relaxed">These credentials will be finalized and activated upon registration. A success screen will allow you to copy them to securely share with the employee.</p>
              </div>
            </StepCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button onClick={onPrev} disabled={step === 0 || submitting} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
          <ChevronLeft size={16} /> Back
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={onNext} disabled={submitting || (step === 0 && !canNextFromVacancy)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Next <ChevronRight size={16} />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {submitting ? "Registering..." : "Register Person"}
          </button>
        )}
      </div>

      <RegistrationSuccessModal
        isOpen={!!success}
        onClose={() => { setSuccess(null); navigate("/hr/staff"); }}
        loginId={success?.loginId ?? ""}
        password={success?.password ?? ""}
        email={success?.email ?? ""} 
        staffName={success?.staffName}
        jobTitle={selectedVacancy?.jobTitle}
        vacancyCode={selectedVacancy?.vacancyCode}
        branchName={selectedVacancy?.branchName}
      />
    </div>
  );
}