import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Briefcase, Building2,
  Globe2, Calendar, Camera, Loader2, AlertCircle, CheckCircle2,
  Lock, RefreshCw, X, Eye, EyeOff, Shield,
} from "lucide-react";
import { personsApi, type PersonDto as BasePersonDto } from "../../api/personsApi";

/** * Extended Interface to fix "Property does not exist" errors 
 * and handle potential undefined values from the API.
 */
interface PersonDto extends BasePersonDto {
  countryName?: string;
  companyName?: string;
  branchName?: string;
  branchId?: number | string;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://localhost:7015";

function getPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function AddressCard({ title, addr }: { title: string; addr: PersonDto["currentAddress"] }) {
  const parts = [addr?.addressLine, addr?.city, addr?.district, addr?.province, addr?.country, addr?.postalCode].filter(Boolean);
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      {parts.length ? (
        <p className="text-sm font-semibold text-slate-700 leading-relaxed">{parts.join(", ")}</p>
      ) : (
        <p className="text-sm text-slate-400 italic">Not provided</p>
      )}
    </div>
  );
}

function ResetPasswordModal({ personId, onClose }: { personId: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    try {
      setLoading(true);
      setError(null);
      await personsApi.resetToDefaultPassword(personId);
      setDone(true);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <RefreshCw size={18} className="text-amber-500" />
            </div>
            <h2 className="text-base font-black text-slate-800">Reset Password</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-bold text-slate-800">Password reset to default</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">This will reset the password back to the system-generated default.</p>
            {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
              <button onClick={handleReset} disabled={loading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reset
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

function ChangePasswordModal({ personId, onClose }: { personId: string; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return setError("All fields required.");
    if (newPassword !== confirmPassword) return setError("Passwords do not match.");
    try {
      setLoading(true);
      await personsApi.changePassword(personId, { currentPassword, newPassword });
      setDone(true);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Change failed.");
    } finally {
      setLoading(false);
    }
  };

  const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-500 transition-all pr-10";

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
              <Lock size={18} className="text-sky-500" />
            </div>
            <h2 className="text-base font-black text-slate-800">Change Password</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-bold text-slate-800">Password changed successfully</p>
            <button onClick={onClose} className="mt-4 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600">Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            {error && <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">{error}</div>}
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={INPUT} placeholder="Current Password" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showCurrent ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            </div>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={INPUT} placeholder="New Password" />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNew ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            </div>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={INPUT} placeholder="Confirm New Password" />
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
              <button onClick={handleChange} disabled={loading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Change
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}

export default function PersonProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [person, setPerson] = useState<PersonDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showChange, setShowChange] = useState(false);

  const fetchPerson = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await personsApi.getById(id);
      setPerson(data as PersonDto);
    } catch {
      setError("Could not load person profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPerson(); }, [fetchPerson]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      setUploadingPhoto(true);
      const result = await personsApi.uploadPhoto(id, file);
      setPerson(prev => prev ? { ...prev, photoUrl: result.photoUrl } : prev);
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 3000);
    } catch { } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="flex h-full w-full items-center justify-center bg-white"><Loader2 size={36} className="animate-spin text-sky-500" /></div>;
  if (error || !person) return <div className="flex h-full flex-col items-center justify-center gap-4 bg-white p-8"><AlertCircle size={40} className="text-red-400" /><p className="text-sm font-semibold text-slate-600">{error ?? "Person not found."}</p><button onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600">Go Back</button></div>;

  const infoRow = (icon: React.ReactNode, label: string, value: string | null | undefined) => (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 shrink-0 text-slate-400">{icon}</div>
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="text-sm font-semibold text-slate-700 truncate">{value || "—"}</p></div>
    </div>
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"><ArrowLeft size={16} /> Back</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              {person.photoUrl ? <img src={getPhotoUrl(person.photoUrl)!} alt={person.fullName} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-white shadow-lg" /> : <div className={`h-24 w-24 rounded-2xl bg-gradient-to-br ${avatarColor(person.fullName)} flex items-center justify-center ring-4 ring-white shadow-lg`}><span className="text-2xl font-black text-white">{initials(person.fullName)}</span></div>}
              <button onClick={() => fileRef.current?.click()} className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-md hover:bg-sky-600 transition-colors">{uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}</button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            {photoSuccess && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={12} /> Photo updated</motion.div>}
            <h1 className="text-xl font-black text-slate-800">{person.fullName}</h1>
            <p className="text-sm font-semibold text-slate-400 mt-0.5">{person.loginId}</p>
            <div className="mt-3">{person.isHired ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 ring-1 ring-inset ring-emerald-500/10"><CheckCircle2 size={11} /> Hired</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500"><User size={11} /> Not Hired</span>}</div>
            <div className="mt-5 w-full space-y-2">
              <button onClick={() => setShowChange(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-2.5 text-xs font-bold text-sky-600 hover:bg-sky-100"><Lock size={13} /> Change Password</button>
              <button onClick={() => setShowReset(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-100"><RefreshCw size={13} /> Reset to Default</button>
            </div>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Quick Info</p>
            {infoRow(<Mail size={14} />, "Email", person.email)}
            {infoRow(<Phone size={14} />, "Phone", person.phone)}
            {infoRow(<User size={14} />, "Gender", person.gender)}
            {infoRow(<Calendar size={14} />, "Date of Birth", person.dateOfBirth ? new Date(person.dateOfBirth).toLocaleDateString("en-GB") : null)}
            {infoRow(<Shield size={14} />, "Marital Status", person.maritalStatus)}
            {infoRow(<Calendar size={14} />, "Registered", person.registeredAt ? new Date(person.registeredAt).toLocaleDateString("en-GB") : null)}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Organization</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Globe2 size={14} />, label: "Country", value: person.countryName },
                { icon: <Building2 size={14} />, label: "Company", value: person.companyName },
                { icon: <MapPin size={14} />, label: "Branch", value: person.branchName },
                { icon: <Briefcase size={14} />, label: "Branch ID", value: person.branchId ? String(person.branchId) : null },
              ].map(({ icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-1"><span className="text-slate-400">{icon}</span><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p></div>
                  <p className="text-sm font-semibold text-slate-700">{value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Addresses</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AddressCard title="Current Address" addr={person.currentAddress} />
              <AddressCard title="Permanent Address" addr={person.permanentAddress} />
            </div>
          </div>
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Account Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {infoRow(<User size={14} />, "Login ID", person.loginId)}
              {infoRow(<Mail size={14} />, "Email", person.email)}
              {infoRow(<Calendar size={14} />, "Registered At", person.registeredAt ? new Date(person.registeredAt).toLocaleString("en-GB") : null)}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showReset && id && <ResetPasswordModal personId={id} onClose={() => setShowReset(false)} />}
        {showChange && id && <ChangePasswordModal personId={id} onClose={() => setShowChange(false)} />}
      </AnimatePresence>
    </div>
  );
}