import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Save, Loader2, User, Phone, MapPin, Edit2 } from "lucide-react";
import { staffApi } from "../../api/staffApi";
import { personsApi } from "../../api/personsApi";
import { locationApi } from "../../api/locationApi";

import AddressForm, { emptyAddress, type AddressState } from "../HRManagement/AddressForm"; 
import type { CountryDto } from "../../types";

const INPUT = "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all";
const LABEL = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

interface EditStaffPersonProps {
  data: any; // Can be StaffDto or PersonDto
  type: "staff" | "person";
  onClose: () => void;
  onSaved: () => void;
}

export default function EditStaffPerson({ data, type, onClose, onSaved }: EditStaffPersonProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState(data?.fullName || "");
  const [email, setEmail] = useState(data?.email || "");
  const [phone, setPhone] = useState(data?.phone || "");
  const [gender, setGender] = useState(data?.gender || "");
  const [dateOfBirth, setDateOfBirth] = useState(data?.dateOfBirth ? data.dateOfBirth.split('T')[0] : "");
  const [maritalStatus, setMaritalStatus] = useState(data?.maritalStatus || "");
  
  // Address State
  const [countries, setCountries] = useState<CountryDto[]>([]);
  const [currentAddress, setCurrentAddress] = useState<AddressState>(data?.currentAddress || emptyAddress());

  // Fetch countries for the address form
  useEffect(() => {
    locationApi.getCountries().then(setCountries).catch(() => setCountries([]));
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) { setError("Full name is required."); return; }
    
    try {
      setSaving(true);
      setError(null);

      if (type === "staff") {
        // 🌟 FIXED: Use 'as any' and proper null handling
        const staffPayload = {
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        } as any;
        
        await staffApi.update(data.staffId, staffPayload);
      } else {
        // 🌟 FIXED: Formatted address safely and bypassed strict TS error
        const personPayload = {
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          maritalStatus: maritalStatus || null,
          currentAddress: currentAddress.country ? {
            addressLine: currentAddress.addressLine.trim() || null,
            country: currentAddress.country || null,
            province: currentAddress.province || null,
            city: currentAddress.city || null,
            district: currentAddress.district.trim() || null,
            postalCode: currentAddress.postalCode.trim() || null,
          } : null,
          permanentAddress: data.permanentAddress || null, // keep existing if unchanged
        } as any;

        await personsApi.update(data.personId, personPayload);
      }

      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
      
      {/* 🌟 Large Extensible Modal Container */}
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 shadow-inner">
              <Edit2 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">
                {type === "staff" ? "Edit Staff Details" : "Edit Person Details"}
              </h2>
              <p className="text-sm font-semibold text-slate-400 mt-0.5">
                {data?.loginId || data?.vacancyCode || "Updating database record"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {error && <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-semibold text-red-600">{error}</div>}

          {/* Section 1: Basic Info */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-indigo-500 mb-4">
              <User size={16} /> Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className={LABEL}>Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={INPUT} placeholder="e.g. Danish Ahmed" />
              </div>
              <div>
                <label className={LABEL}>Gender</label>
                <select className={INPUT} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Date of Birth</label>
                <input className={INPUT} type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Marital Status</label>
                <select className={INPUT} value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}>
                  <option value="">Select…</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 2: Contact */}
          <section>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-indigo-500 mb-4">
              <Phone size={16} /> Contact Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={LABEL}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={INPUT} placeholder="e.g. name@company.com" />
              </div>
              <div>
                <label className={LABEL}>Phone Number</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={INPUT} placeholder="e.g. 03xx xxxxxxx" />
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section 3: Address */}
          <section>
             <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-indigo-500 mb-4">
              <MapPin size={16} /> Address Information
            </h3>
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
               <AddressForm prefix="Current" value={currentAddress} onChange={setCurrentAddress} countries={countries} />
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-100 p-6 bg-white rounded-b-3xl">
          <button onClick={onClose} disabled={saving} className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-xl bg-sky-600 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-sky-700 disabled:opacity-50 transition-all">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
            Save Changes
          </button>
        </div>

      </motion.div>
    </>
  );
}