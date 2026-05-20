import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, LogOut, ShieldCheck, ChevronDown, 
  Loader2, Briefcase, ChevronRight, CheckCircle2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { AuthAPI } from "../../api/auth";

import api from "../../api/axios"; 
import type { StaffDto } from "../../types"; 

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [staffDetails, setStaffDetails] = useState<StaffDto | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { userEmail, userRoles, logout } = useAuthStore();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userEmail) return;
      
      try {
        setLoadingProfile(true);
        const response = await api.get<StaffDto>(`/api/employees/by-login/${userEmail}`);
        setStaffDetails(response.data);
      } catch (error) {
        console.error("Could not fetch profile details for", userEmail, error);
      } finally {
        setLoadingProfile(false);
      }
    };

    if (isOpen && !staffDetails) {
      fetchProfile();
    }
  }, [userEmail, isOpen, staffDetails]);

  const displayName = staffDetails?.fullName || userEmail || "Unknown User";
  const initial = displayName.charAt(0).toUpperCase();
  
  const displayRoles = staffDetails?.jobTitle 
    ? [staffDetails.jobTitle] 
    : (userRoles.length > 0 ? userRoles : []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await AuthAPI.logout();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      logout();
      // Dispatch event so Sidebar clears its menu items immediately
      window.dispatchEvent(new CustomEvent('user-logged-out'));
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* 🌟 Premium Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 rounded-full p-1.5 pl-2 transition-all duration-300 ease-out border backdrop-blur-md active:scale-95
          ${isOpen 
            ? 'bg-white/20 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
            : 'bg-white/10 border-white/10 hover:bg-white/15 hover:border-white/30'}`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#00A3FF] to-[#01CBFF] text-sm font-black text-white shadow-inner ring-2 ring-white/20">
          {loadingProfile ? <Loader2 size={14} className="animate-spin text-white" /> : initial}
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2.5}
          className={`text-white pr-1 transition-transform duration-400 ease-out ${isOpen ? "-rotate-180" : ""}`}
        />
      </button>

      {/* 🌟 High-End Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 10, scale: 0.95, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="absolute right-0 mt-3 w-80 origin-top-right overflow-hidden rounded-[24px] bg-white/95 p-2 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5 backdrop-blur-xl"
          >
            {/* User Info Card */}
            <div className="relative flex flex-col items-center p-6 bg-gradient-to-b from-slate-50/80 to-white rounded-2xl mb-2 border border-slate-100 shadow-sm overflow-hidden">
              
              {/* Decorative Background Blob */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

              {/* Big Avatar with Online Status */}
              <div className="relative mb-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-[#00A3FF] to-[#01CBFF] text-3xl font-black text-white shadow-lg ring-4 ring-white">
                  {loadingProfile ? <Loader2 size={28} className="animate-spin text-white" /> : initial}
                </div>
                <div className="absolute bottom-0 right-0 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-white" title="Online"></div>
              </div>
              
              {/* Identity */}
              <h3 className="text-xl font-black text-slate-800 tracking-tight text-center z-10">
                {displayName}
              </h3>
              <p className="text-sm font-semibold text-slate-400 mt-0.5 z-10">{userEmail}</p>

              {/* Department Tag */}
              {staffDetails?.department && (
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 z-10">
                  <Briefcase size={13} className="text-slate-400" />
                  {staffDetails.department}
                </div>
              )}
              
              {/* High-End Job Title Badge */}
              <div className="mt-5 w-full z-10">
                {displayRoles.length > 0 ? (
                  displayRoles.map((role) => (
                    <div
                      key={role}
                      className="flex w-full items-center justify-between rounded-xl bg-[#00A3FF]/5 px-4 py-2.5 border border-[#00A3FF]/10 transition-colors hover:bg-[#00A3FF]/10"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-[#00A3FF]" />
                        <span className="text-xs font-black uppercase tracking-wider text-[#00A3FF]">{role}</span>
                      </div>
                      <CheckCircle2 size={16} className="text-[#00A3FF]/50" />
                    </div>
                  ))
                ) : (
                  <div className="flex w-full justify-center rounded-xl bg-slate-50 px-4 py-2 border border-slate-100">
                    <span className="text-xs font-medium text-slate-400">No Job Title Assigned</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions List */}
            <div className="p-1 space-y-1">
              <button
                onClick={() => { setIsOpen(false); navigate("/hr/staff"); }}
                className="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-[#00A3FF]">
                <div className="flex items-center gap-3">
                  <User size={18} className="text-slate-400 group-hover:text-[#00A3FF] transition-colors" />
                  Staff & Persons
                </div>
                <ChevronRight size={16} className="text-slate-300 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
              </button>
              
              <button
                onClick={handleLogout}
                className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={18} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}