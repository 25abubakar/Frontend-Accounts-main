import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, UserMinus, ArrowRightLeft, Search, Loader2, Briefcase, AlertTriangle, MapPin, CheckCircle2, Trash2, Edit2, Save } from "lucide-react";
import { staffApi } from "../../api/staffApi";
import { personsApi } from "../../api/personsApi";
import { positionApi } from "../../api/positionApi";
import type { StaffDto, VacancyDto, UpdateStaffDto } from "../../types";
import type { PersonDto } from "../../api/personsApi";
import { PersonAvatar } from "./StaffTables";

const INPUT = "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all";
const LABEL = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

export function FireModal({ staff, onClose, onFired }: { staff: StaffDto; onClose: () => void; onFired: () => void; }) {
  const [firing, setFiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFire = async () => {
    try {
      setFiring(true); setError(null);
      await staffApi.fire(staff.staffId);
      onFired();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to fire employee.");
    } finally { setFiring(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto"><UserMinus size={28} className="text-red-500" /></div>
        <h2 className="text-center text-lg font-black text-slate-800">Fire Employee?</h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500"><strong>{staff.fullName}</strong> will be removed from <strong>{staff.jobTitle}</strong>. The position will become vacant.</p>
        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={firing} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
          <button onClick={handleFire} disabled={firing} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600 disabled:opacity-50">
            {firing ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />} Fire
          </button>
        </div>
      </motion.div>
    </>
  );
}

export function TransferModal({ staff, onClose, onTransferred }: { staff: StaffDto; onClose: () => void; onTransferred: () => void; }) {
  const [vacancies, setVacancies] = useState<VacancyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVacancyId, setSelectedVacancyId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    positionApi.getVacant()
      .then(data => setVacancies(data.filter(v => v.vacancyId !== staff.vacancyId)))
      .catch(() => setVacancies([]))
      .finally(() => setLoading(false));
  }, [staff.vacancyId]);

  const filtered = vacancies.filter(v => {
    const q = search.toLowerCase();
    return v.jobTitle.toLowerCase().includes(q) || v.vacancyCode.toLowerCase().includes(q) || (v.branchName ?? "").toLowerCase().includes(q) || (v.companyName ?? "").toLowerCase().includes(q);
  });

  const handleTransfer = async () => {
    if (!selectedVacancyId) { setError("Please select a target position."); return; }
    try {
      setTransferring(true); setError(null);
      await staffApi.transfer(staff.staffId, { newVacancyId: selectedVacancyId });
      onTransferred();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Transfer failed.");
    } finally { setTransferring(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[85vh] flex flex-col">
        <div className="mb-5 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100"><ArrowRightLeft size={18} className="text-amber-500" /></div>
            <div><h2 className="text-lg font-black text-slate-800">Transfer Employee</h2><p className="text-xs font-semibold text-slate-400">{staff.fullName}</p></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600 shrink-0">{error}</div>}
        <div className="mb-3 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vacant positions…" className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm font-semibold focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={28} className="animate-spin text-sky-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center"><Briefcase size={36} className="text-slate-200 mb-3" strokeWidth={1.5} /><p className="text-sm font-black text-slate-600">No vacant positions found</p></div>
          ) : (
            filtered.map(v => (
              <button key={v.vacancyId} onClick={() => setSelectedVacancyId(v.vacancyId)} className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${selectedVacancyId === v.vacancyId ? "border-sky-500 bg-sky-50 ring-4 ring-sky-500/10" : "border-slate-100 bg-white hover:border-sky-200 hover:shadow-sm"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 ring-1 ring-inset ring-indigo-500/10 mb-1">{v.vacancyCode}</span>
                    <p className="font-black text-slate-800 text-sm">{v.jobTitle}</p>
                    {v.department && <p className="text-xs font-semibold text-slate-400">{v.department}</p>}
                    <div className="flex items-center gap-1 mt-1 text-xs font-semibold text-slate-400"><MapPin size={10} className="shrink-0" /><span className="truncate">{[v.branchName, v.companyName, v.countryName].filter(Boolean).join(" › ")}</span></div>
                  </div>
                  {selectedVacancyId === v.vacancyId && <CheckCircle2 size={18} className="text-sky-500 shrink-0 mt-1" />}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 shrink-0">
          <button onClick={onClose} disabled={transferring} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={handleTransfer} disabled={transferring || !selectedVacancyId} className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-600 disabled:opacity-50">
            {transferring ? <Loader2 size={15} className="animate-spin" /> : <ArrowRightLeft size={15} />} Transfer
          </button>
        </div>
      </motion.div>
    </>
  );
}

export function DeletePersonModal({ person, onClose, onDeleted }: { person: PersonDto; onClose: () => void; onDeleted: () => void; }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setDeleting(true); setError(null);
      await personsApi.delete(person.personId);
      onDeleted();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to delete person.");
    } finally { setDeleting(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto"><AlertTriangle size={28} className="text-red-500" /></div>
        <h2 className="text-center text-lg font-black text-slate-800">Delete Person?</h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500"><strong>{person.fullName}</strong> will be permanently removed from the system.</p>
        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={deleting} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600 disabled:opacity-50">
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}

export function ViewPersonModal({ person, onClose }: { person: PersonDto; onClose: () => void; }) {
  const field = (label: string, value: string | null | undefined) => (
    <div key={label}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value || "—"}</p>
    </div>
  );

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <PersonAvatar person={person} size={14} />
            <div>
              <h2 className="text-lg font-black text-slate-800">{person.fullName}</h2>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 mt-0.5">{person.loginId}</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">Personal</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {field("Gender", person.gender)}
              {field("Date of Birth", person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString("en-GB") : null)}
              {field("Marital Status", person.maritalStatus)}
              {field("Phone", person.phone)}
              {field("Email", person.email)}
              {field("Status", person.isHired ? "Hired" : "Not Hired")}
              {field("Registered", person.registeredAt ? new Date(person.registeredAt).toLocaleDateString("en-GB") : null)}
            </div>
          </div>
          {person.currentAddress && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5"><MapPin size={11} /> Current Address</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {field("Address", person.currentAddress.addressLine)}
                {field("Country", person.currentAddress.country)}
                {field("Province", person.currentAddress.province)}
                {field("City", person.currentAddress.city)}
                {field("District", person.currentAddress.district)}
                {field("Postal Code", person.currentAddress.postalCode)}
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">Close</button>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// EDIT STAFF MODAL
// ─────────────────────────────────────────────────────────
export function EditStaffModal({ staff, onClose, onSaved }: { staff: StaffDto; onClose: () => void; onSaved: () => void; }) {
  const [fullName, setFullName] = useState(staff.fullName ?? "");
  const [email, setEmail] = useState(staff.email ?? "");
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullName.trim()) { setError("Full name is required."); return; }
    try {
      setSaving(true); setError(null);
      const payload: UpdateStaffDto = {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };
      await staffApi.update(staff.staffId, payload);
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to save changes.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100"><Edit2 size={18} className="text-sky-500" /></div>
            <div><h2 className="text-lg font-black text-slate-800">Edit Staff</h2><p className="text-xs font-semibold text-slate-400">{staff.vacancyCode}</p></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}
        <div className="space-y-4">
          <div><label className={LABEL}>Full Name <span className="text-red-500">*</span></label><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT} /></div>
          <div><label className={LABEL}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} /></div>
          <div><label className={LABEL}>Phone</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={INPUT} /></div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Changes
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// EDIT PERSON MODAL
// ─────────────────────────────────────────────────────────
export function EditPersonModal({ person, onClose, onSaved }: { person: PersonDto; onClose: () => void; onSaved: () => void; }) {
  const [fullName, setFullName] = useState(person.fullName ?? "");
  const [phone, setPhone] = useState(person.phone ?? "");
  const [email, setEmail] = useState(person.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullName.trim()) { setError("Full name is required."); return; }
    try {
      setSaving(true); setError(null);
      await personsApi.update(person.personId, {
        fullName: fullName.trim(),
        gender: person.gender,
        dateOfBirth: person.dateOfBirth,
        maritalStatus: person.maritalStatus,
        phone: phone.trim(),
        email: email.trim(),
        currentAddress: person.currentAddress,
        permanentAddress: person.permanentAddress,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to save changes.");
    } finally { setSaving(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100"><Edit2 size={18} className="text-indigo-500" /></div>
            <div><h2 className="text-lg font-black text-slate-800">Edit Person</h2><p className="text-xs font-semibold text-slate-400">{person.loginId}</p></div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}
        <div className="space-y-4">
          <div><label className={LABEL}>Full Name <span className="text-red-500">*</span></label><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT} /></div>
          <div><label className={LABEL}>Phone</label><input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={INPUT} /></div>
          <div><label className={LABEL}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} /></div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Changes
          </button>
        </div>
      </motion.div>
    </>
  );
}