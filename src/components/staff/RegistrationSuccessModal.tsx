import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Copy, Check, X, KeyRound, User, Briefcase, MapPin, Mail, AlertTriangle } from "lucide-react";

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  loginId: string;
  password: string;
  email: string;
  staffName?: string;
  jobTitle?: string;
  vacancyCode?: string;
  branchName?: string;
}

export default function RegistrationSuccessModal({
  isOpen,
  onClose,
  loginId,
  password,
  email,
  staffName,
  jobTitle,
  vacancyCode,
  branchName,
}: RegistrationSuccessModalProps) {
  const [copiedLoginId, setCopiedLoginId] = useState(false);

  const handleCopyLoginId = async () => {
    try {
      await navigator.clipboard.writeText(loginId);
      setCopiedLoginId(true);
      setTimeout(() => setCopiedLoginId(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle blurred backdrop */}
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-slate-200"
          >
            {/* Eye-catching decorative top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400" />

            <div className="p-8">
              <button 
                onClick={onClose}
                className="absolute right-4 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Success icon & Header */}
              <div className="mb-6 flex flex-col items-center text-center">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                  className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm ring-8 ring-emerald-50/50 border border-emerald-100"
                >
                  <CheckCircle2 size={40} className="text-emerald-500 drop-shadow-sm" />
                </motion.div>
                <h2 className="text-2xl font-black tracking-tight text-slate-800">Registration Complete!</h2>
                <p className="mt-1.5 text-sm font-medium text-slate-500">
                  <strong className="text-slate-700">{staffName}</strong> is now successfully registered.
                </p>
              </div>

              {/* Staff info Pill */}
              {(jobTitle || vacancyCode || branchName) && (
                <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-indigo-50 bg-gradient-to-b from-indigo-50/50 to-white p-4 shadow-sm">
                  {jobTitle && (
                    <div className="flex items-center gap-2.5 text-sm font-bold text-indigo-900">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                        <Briefcase size={12} />
                      </div>
                      <span className="truncate">{jobTitle}</span>
                      {vacancyCode && (
                        <span className="ml-auto shrink-0 rounded-md bg-white px-2 py-1 text-[10px] font-black tracking-wider text-indigo-500 shadow-sm ring-1 ring-indigo-100">
                          {vacancyCode}
                        </span>
                      )}
                    </div>
                  )}
                  {branchName && (
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-500">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-400">
                        <MapPin size={12} />
                      </div>
                      <span className="truncate">{branchName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Credentials Box (Lite & Professional) */}
              <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
                <div className="bg-white p-1">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                    
                    {/* Login ID */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 shadow-sm">
                          <User size={14} strokeWidth={2.5} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Login ID</span>
                      </div>
                      <span className="select-all rounded-md bg-white px-3 py-1.5 font-mono text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                        {loginId}
                      </span>
                    </div>
                    
                    <div className="border-b border-dashed border-slate-200" />
                    
                    {/* Password */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 shadow-sm">
                          <KeyRound size={14} strokeWidth={2.5} />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Password</span>
                      </div>
                      <span className="select-all rounded-md bg-white px-3 py-1.5 font-mono text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                        {password}
                      </span>
                    </div>

                    {/* Email */}
                    {email && (
                      <>
                        <div className="border-b border-dashed border-slate-200" />
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 shadow-sm">
                              <Mail size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Email</span>
                          </div>
                          <span 
                            className="select-all truncate max-w-[170px] rounded-md bg-white px-3 py-1.5 font-mono text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200" 
                            title={email}
                          >
                            {email}
                          </span>
                        </div>
                      </>
                    )}

                  </div>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 shadow-sm">
                <AlertTriangle size={16} className="mt-0.5 text-amber-500 shrink-0" />
                <p className="text-xs font-semibold leading-relaxed text-amber-800">
                  Please securely copy and share these credentials with the employee. For security, <strong className="text-amber-900 font-bold">they will not be shown again.</strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCopyLoginId}
                  className="group flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all active:scale-95"
                >
                  {copiedLoginId ? (
                    <><Check size={16} className="text-emerald-500" /> <span className="text-emerald-600">Copied!</span></>
                  ) : (
                    <><Copy size={16} className="text-slate-400 group-hover:text-sky-500 transition-colors" /> Copy ID</>
                  )}
                </button>
                <button 
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-black text-white shadow-md hover:from-indigo-500 hover:to-blue-500 hover:shadow-lg transition-all active:scale-95"
                >
                  Done & Close
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}