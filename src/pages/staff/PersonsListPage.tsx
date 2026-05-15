
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Loader2, Users, Mail, Phone, Eye, Edit2, Trash2,
  X, AlertCircle, UserPlus, AlertTriangle, Save, Camera,
  MapPin, User, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { personsApi, type PersonDto, type UpdatePersonDto } from "../../api/personsApi";
import { locationApi } from "../../api/locationApi";
import { containerVariants, itemVariants } from "../../utils/orgGroupTreeDesign";

// ── helpers ───────────────────────────────────────────────────────────────
const INPUT =
  "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all";
const LABEL = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

function Avatar({ person, size = 10 }: { person: PersonDto; size?: number }) {
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

type AddrObj = { addressLine?: string; country?: string; province?: string; city?: string; district?: string; postalCode?: string } | null | undefined;

/** Returns true if the address object has at least one non-empty field */
function hasAddress(addr: AddrObj): boolean {
  if (!addr) return false;
  return !!(addr.addressLine || addr.country || addr.province || addr.city || addr.district || addr.postalCode);
}

/** Returns true if both addresses are identical (all fields match) */
function isSameAddress(a: AddrObj, b: AddrObj): boolean {
  if (!a || !b) return false;
  return (
    (a.addressLine ?? "") === (b.addressLine ?? "") &&
    (a.country ?? "") === (b.country ?? "") &&
    (a.province ?? "") === (b.province ?? "") &&
    (a.city ?? "") === (b.city ?? "") &&
    (a.district ?? "") === (b.district ?? "") &&
    (a.postalCode ?? "") === (b.postalCode ?? "")
  );
}

// ── View Modal ────────────────────────────────────────────────────────────
function ViewModal({ person, onClose }: { person: PersonDto; onClose: () => void }) {
  const field = (label: string, value: string | null | undefined) => (
    <div key={label}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value || "—"}</p>
    </div>
  );

  const AddressBlock = ({ addr, title }: { addr: AddrObj; title: string }) => (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1.5">
        <MapPin size={11} /> {title}
      </p>
      {hasAddress(addr) ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {field("Address", addr?.addressLine)}
          {field("Country", addr?.country)}
          {field("Province", addr?.province)}
          {field("District", addr?.district)}
          {field("City", addr?.city)}
          {field("Postal Code", addr?.postalCode)}
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-400">No address on record.</p>
      )}
    </div>
  );

  const cur = person.currentAddress;
  const perm = person.permanentAddress;
  const sameAddr = isSameAddress(cur, perm);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar person={person} size={14} />
            <div>
              <h2 className="text-lg font-black text-slate-800">{person.fullName}</h2>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 mt-0.5">
                {person.loginId}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* Personal */}
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

          {/* Address section — smart rendering */}
          {sameAddr ? (
            /* Both addresses are identical — show once with a badge */
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                  <MapPin size={11} /> Address
                </p>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-black text-indigo-500 ring-1 ring-inset ring-indigo-500/10">
                  Current = Permanent
                </span>
              </div>
              {hasAddress(cur) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {field("Address", cur?.addressLine)}
                  {field("Country", cur?.country)}
                  {field("Province", cur?.province)}
                  {field("District", cur?.district)}
                  {field("City", cur?.city)}
                  {field("Postal Code", cur?.postalCode)}
                </div>
              ) : (
                <p className="text-sm font-semibold text-slate-400">No address on record.</p>
              )}
            </div>
          ) : (
            /* Addresses differ — show both */
            <>
              <AddressBlock addr={cur} title="Current Address" />
              <AddressBlock addr={perm} title="Permanent Address" />
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose}
            className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200">
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────

// Cascading address block with live dropdowns
interface EditAddressBlockProps {
  title: string;
  addressLine: string; setAddressLine: (v: string) => void;
  country: string;     setCountry: (v: string) => void;
  province: string;    setProvince: (v: string) => void;
  city: string;        setCity: (v: string) => void;
  district: string;    setDistrict: (v: string) => void;
  postalCode: string;  setPostalCode: (v: string) => void;
  allCountries: { name: string; code: string }[];
}

function EditAddressBlock({
  title, addressLine, setAddressLine,
  country, setCountry, province, setProvince,
  city, setCity, district, setDistrict,
  postalCode, setPostalCode, allCountries,
}: EditAddressBlockProps) {
  const [provinces, setProvinces] = useState<{ name: string }[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingProv, setLoadingProv] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);

  useEffect(() => {
    if (!country) { setProvinces([]); return; }
    setLoadingProv(true);
    locationApi.getProvinces(country)
      .then(data => setProvinces(data))
      .catch(() => setProvinces([]))
      .finally(() => setLoadingProv(false));
  }, [country]);

  useEffect(() => {
    if (!country || !province) { setCities([]); return; }
    setLoadingCity(true);
    locationApi.getCities(country, province)
      .then(data => setCities(data))
      .catch(() => setCities([]))
      .finally(() => setLoadingCity(false));
  }, [country, province]);

  const disabledCls = "w-full rounded-xl border-2 border-slate-100 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed";

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-1">
        <MapPin size={11} /> {title}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={LABEL}>Address Line</label>
          <textarea rows={2} value={addressLine} onChange={e => setAddressLine(e.target.value)} className={INPUT + " resize-none"} />
        </div>
        <div>
          <label className={LABEL}>Country</label>
          <select value={country} onChange={e => { setCountry(e.target.value); setProvince(""); setCity(""); }} className={INPUT}>
            <option value="">Select country</option>
            {allCountries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Province / State</label>
          <div className="relative">
            <select value={province} onChange={e => { setProvince(e.target.value); setCity(""); }}
              disabled={!country || loadingProv} className={!country || loadingProv ? disabledCls : INPUT}>
              <option value="">{loadingProv ? "Loading…" : !country ? "Select country first" : "Select province"}</option>
              {provinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            {loadingProv && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400 pointer-events-none" />}
          </div>
        </div>
        <div>
          <label className={LABEL}>City</label>
          <div className="relative">
            <select value={city} onChange={e => setCity(e.target.value)}
              disabled={!province || loadingCity} className={!province || loadingCity ? disabledCls : INPUT}>
              <option value="">{loadingCity ? "Loading…" : !province ? "Select province first" : "Select city"}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {loadingCity && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-400 pointer-events-none" />}
          </div>
        </div>
        <div>
          <label className={LABEL}>District</label>
          <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}>Postal Code</label>
          <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} className={INPUT} />
        </div>
      </div>
    </div>
  );
}

function EditModal({ person, onClose, onSaved }: { person: PersonDto; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName]           = useState(person.fullName ?? "");
  const [gender, setGender]               = useState(person.gender ?? "");
  const [dateOfBirth, setDateOfBirth]     = useState(person.dateOfBirth ? person.dateOfBirth.split("T")[0] : "");
  const [maritalStatus, setMaritalStatus] = useState(person.maritalStatus ?? "");
  const [phone, setPhone]                 = useState(person.phone ?? "");
  const [email, setEmail]                 = useState(person.email ?? "");

  const [curLine, setCurLine]         = useState(person.currentAddress?.addressLine ?? "");
  const [curCountry, setCurCountry]   = useState(person.currentAddress?.country ?? "");
  const [curProvince, setCurProvince] = useState(person.currentAddress?.province ?? "");
  const [curCity, setCurCity]         = useState(person.currentAddress?.city ?? "");
  const [curDistrict, setCurDistrict] = useState(person.currentAddress?.district ?? "");
  const [curPostal, setCurPostal]     = useState(person.currentAddress?.postalCode ?? "");

  const [permLine, setPermLine]         = useState(person.permanentAddress?.addressLine ?? "");
  const [permCountry, setPermCountry]   = useState(person.permanentAddress?.country ?? "");
  const [permProvince, setPermProvince] = useState(person.permanentAddress?.province ?? "");
  const [permCity, setPermCity]         = useState(person.permanentAddress?.city ?? "");
  const [permDistrict, setPermDistrict] = useState(person.permanentAddress?.district ?? "");
  const [permPostal, setPermPostal]     = useState(person.permanentAddress?.postalCode ?? "");

  const [sameAsCurrent, setSameAsCurrent] = useState(() =>
    isSameAddress(person.currentAddress, person.permanentAddress)
  );

  useEffect(() => {
    if (!sameAsCurrent) return;
    setPermLine(curLine); setPermCountry(curCountry); setPermProvince(curProvince);
    setPermCity(curCity); setPermDistrict(curDistrict); setPermPostal(curPostal);
  }, [sameAsCurrent, curLine, curCountry, curProvince, curCity, curDistrict, curPostal]);

  const [allCountries, setAllCountries] = useState<{ name: string; code: string }[]>([]);
  useEffect(() => {
    locationApi.getCountries().then(setAllCountries).catch(() => setAllCountries([]));
  }, []);

  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!fullName.trim()) { setError("Full name is required."); return; }
    try {
      setSaving(true); setError(null);
      const payload: UpdatePersonDto = {
        fullName:      fullName.trim(),
        gender,
        dateOfBirth:   dateOfBirth,   // already "YYYY-MM-DD" from date input
        maritalStatus,
        phone:         phone.trim(),
        email:         email.trim(),
        currentAddress: {
          addressLine: curLine.trim(),
          country:     curCountry,
          province:    curProvince,
          city:        curCity,
          district:    curDistrict.trim(),
          postalCode:  curPostal.trim(),
        },
        permanentAddress: {
          addressLine: (sameAsCurrent ? curLine    : permLine).trim(),
          country:      sameAsCurrent ? curCountry : permCountry,
          province:     sameAsCurrent ? curProvince: permProvince,
          city:         sameAsCurrent ? curCity    : permCity,
          district:    (sameAsCurrent ? curDistrict: permDistrict).trim(),
          postalCode:  (sameAsCurrent ? curPostal  : permPostal).trim(),
        },
      };
      await personsApi.update(person.personId, payload);
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; title?: string; errors?: Record<string, string[]> } } };
      const d = err.response?.data;
      const msg = d?.message
        ?? (d?.errors ? Object.values(d.errors).flat().join(" ") : null)
        ?? d?.title
        ?? "Failed to save changes.";
      setError(msg);
    } finally { setSaving(false); }
  };

  const handlePhoto = async (file: File) => {
    try { setUploading(true); await personsApi.uploadPhoto(person.personId, file); onSaved(); }
    catch { /* silent */ } finally { setUploading(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
              <Edit2 size={18} className="text-sky-500" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">Edit Person</h2>
              <p className="text-xs font-semibold text-slate-400">{person.loginId}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">{error}</div>}

        {/* Photo */}
        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="relative h-16 w-16 shrink-0">
            <Avatar person={person} size={16} />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 size={16} className="animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handlePhoto(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <Camera size={13} /> Upload Photo
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal */}
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3">Personal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={LABEL}>Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Gender</label>
                <select value={gender} onChange={e => setGender(e.target.value)} className={INPUT}>
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Marital Status</label>
                <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className={INPUT}>
                  <option value="">Select…</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={INPUT} />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} />
              </div>
            </div>
          </div>

          {/* Current Address with cascading dropdowns */}
          <EditAddressBlock
            title="Current Address"
            addressLine={curLine}    setAddressLine={setCurLine}
            country={curCountry}     setCountry={setCurCountry}
            province={curProvince}   setProvince={setCurProvince}
            city={curCity}           setCity={setCurCity}
            district={curDistrict}   setDistrict={setCurDistrict}
            postalCode={curPostal}   setPostalCode={setCurPostal}
            allCountries={allCountries}
          />

          {/* Same-as-current toggle */}
          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <div onClick={() => setSameAsCurrent(v => !v)}
              className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                sameAsCurrent ? "border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"
              }`}>
              {sameAsCurrent && <CheckCircle2 size={12} className="text-white" />}
            </div>
            <span className="text-sm font-semibold text-slate-600">Permanent address same as current</span>
          </label>

          {/* Permanent Address */}
          {sameAsCurrent ? (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-sm font-semibold text-indigo-700">Permanent address will be copied from current address.</p>
            </div>
          ) : (
            <EditAddressBlock
              title="Permanent Address"
              addressLine={permLine}    setAddressLine={setPermLine}
              country={permCountry}     setCountry={setPermCountry}
              province={permProvince}   setProvince={setPermProvince}
              city={permCity}           setCity={setPermCity}
              district={permDistrict}   setDistrict={setPermDistrict}
              postalCode={permPostal}   setPostalCode={setPermPostal}
              allCountries={allCountries}
            />
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
            Save Changes
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────
function DeleteModal({ person, onClose, onDeleted }: { person: PersonDto; onClose: () => void; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setDeleting(true); setError(null);
      await personsApi.delete(person.personId);
      onDeleted();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message ?? "Failed to delete person.");
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
        <h2 className="text-center text-lg font-black text-slate-800">Delete Person?</h2>
        <p className="mt-2 text-center text-sm font-medium text-slate-500">
          <strong>{person.fullName}</strong> will be permanently removed from the system.
        </p>
        {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-600 disabled:opacity-50">
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Delete
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
type FilterTab = "all" | "hired" | "not-hired";

export default function PersonsListPage() {
  const navigate = useNavigate();
  const [persons, setPersons] = useState<PersonDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  const [viewTarget, setViewTarget] = useState<PersonDto | null>(null);
  const [editTarget, setEditTarget] = useState<PersonDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonDto | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setApiError(null);
      const data = await personsApi.getAll();
      setPersons(data);
    } catch {
      setApiError("Unable to connect to the server.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = persons.filter(p => {
    const q = debouncedQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.loginId.toLowerCase().includes(q) ||
      (p.currentAddress?.city ?? "").toLowerCase().includes(q);
    const matchesTab =
      tab === "all" ||
      (tab === "hired" && p.isHired) ||
      (tab === "not-hired" && !p.isHired);
    return matchesSearch && matchesTab;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "hired", label: "Hired" },
    { key: "not-hired", label: "Not Hired" },
  ];

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Persons Directory</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-400">
            {persons.length} person{persons.length !== 1 ? "s" : ""} registered in the system
          </p>
        </div>
        <button
          onClick={() => navigate("/hr/staff/register")}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all"
        >
          <UserPlus size={16} />
          Register New Person
        </button>
      </div>

      {/* API error */}
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
            placeholder="Search by name, login ID, city..."
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
                tab === t.key
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {t.label}
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
                <th className="border-b border-slate-200 px-6 py-4">Person</th>
                <th className="border-b border-slate-200 px-6 py-4">Login ID</th>
                <th className="border-b border-slate-200 px-6 py-4">Gender</th>
                <th className="border-b border-slate-200 px-6 py-4">City</th>
                <th className="border-b border-slate-200 px-6 py-4">Contact</th>
                <th className="border-b border-slate-200 px-6 py-4">Status</th>
                <th className="sticky right-0 z-20 border-b border-slate-200 bg-slate-50/95 px-6 py-4 text-right shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.05)]">
                  Actions
                </th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="bg-white">
              {filtered.map(person => (
                <motion.tr key={person.personId} variants={itemVariants}
                  className="group transition-colors hover:bg-blue-50/30">

                  {/* Person */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar person={person} size={10} />
                      <p className="font-bold text-slate-900">{person.fullName}</p>
                    </div>
                  </td>

                  {/* Login ID */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      {person.loginId}
                    </span>
                  </td>

                  {/* Gender */}
                  <td className="border-b border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                    {person.gender || "—"}
                  </td>

                  {/* City */}
                  <td className="border-b border-slate-100 px-6 py-4 text-xs font-semibold text-slate-500">
                    {person.currentAddress?.city || "—"}
                  </td>

                  {/* Contact */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <Phone size={11} className="text-slate-400 shrink-0" />
                        {person.phone || "—"}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                        <Mail size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{person.email || "—"}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="border-b border-slate-100 px-6 py-4">
                    {person.isHired ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-600 ring-1 ring-inset ring-emerald-500/10">
                        <CheckCircle2 size={11} /> Hired
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-600 ring-1 ring-inset ring-amber-500/10">
                        <User size={11} /> Not Hired
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="sticky right-0 z-10 border-b border-slate-100 bg-white px-6 py-4 text-right transition-colors group-hover:bg-[#f4f7fa] shadow-[-12px_0_15px_-10px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setViewTarget(person)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-sky-500"
                        title="View">
                        <Eye size={15} strokeWidth={2.5} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setEditTarget(person)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-500"
                        title="Edit">
                        <Edit2 size={15} strokeWidth={2.5} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => setDeleteTarget(person)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title="Delete">
                        <Trash2 size={15} strokeWidth={2.5} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}

              {filtered.length === 0 && (
                <motion.tr variants={itemVariants}>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Users size={40} className="mx-auto mb-4 text-slate-200" strokeWidth={1.5} />
                    <h3 className="text-sm font-black text-slate-700">No persons found</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {query ? "Try a different search term." : "Register new persons to get started."}
                    </p>
                  </td>
                </motion.tr>
              )}
            </motion.tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-right text-[11px] font-bold text-slate-400">
        Showing {filtered.length} of {persons.length} record{persons.length !== 1 ? "s" : ""}
      </p>

      {/* Modals */}
      <AnimatePresence>
        {viewTarget && <ViewModal person={viewTarget} onClose={() => setViewTarget(null)} />}
        {editTarget && (
          <EditModal
            person={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={fetchAll}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            person={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDeleted={fetchAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
