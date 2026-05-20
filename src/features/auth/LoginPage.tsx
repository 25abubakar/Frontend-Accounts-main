import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Lock, EyeOff, Eye, ShieldCheck, ArrowRight, Sun, Moon, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { AuthAPI } from "../../api/auth";
import { rbacApi } from "../../api/rbacApi";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode]     = useState(true);
  const [apiError, setApiError]         = useState<string | null>(null);

  const navigate  = useNavigate();
  const setLogin  = useAuthStore(s => s.setLogin);
  const setPermissions = useAuthStore(s => s.setPermissions);
  const setStaffId     = useAuthStore(s => s.setStaffId);
  const { refreshAccessibleData } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setApiError(null);

      // 1. Login — username (not email)
      const result = await AuthAPI.login({
        userName: data.username,
        password: data.password,
        rememberMe: true,
      });

      if (!result.success) {
        setApiError(result.message || "Login failed. Check your credentials.");
        return;
      }

      // 2. Store basic auth state immediately
      setLogin(
        result.email ?? data.username,
        result.roles ?? [],
        result.userName ?? data.username,
        null,
        []
      );

      // 3. Try to get staffId from /api/Auth/me (non-blocking)
      try {
        const meRes = await api.get('/api/Auth/me');
        const me = meRes.data as Record<string, unknown>;
        const sid = (me?.staffId ?? me?.StaffId ?? null) as string | null;
        if (sid) {
          setStaffId(sid);
          // 4. Fetch effective permissions
          const perms = await rbacApi.getEffectivePermissions(sid);
          const keys = perms.filter(p => p.hasAccess).map(p => p.featureKey);
          setPermissions(keys);
        }
      } catch { /* non-critical — permissions will be empty, all nav visible */ }

      // 5. Fetch accessible data (permissions + filtered data)
      try {
        await refreshAccessibleData();
      } catch { /* non-critical — will use empty permissions */ }

      // 6. Notify sidebar to refetch with new user's permissions
      window.dispatchEvent(new CustomEvent('navigation-updated'));

      navigate("/dashboard", { replace: true });

    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message || "Invalid credentials or server error.");
    }
  };

  return (
    <div className={`relative flex min-h-screen w-full items-center justify-center p-4 font-sans overflow-hidden transition-colors duration-700 ${
      isDarkMode ? "bg-[#1A2936]" : "bg-[#F8FAFC]"
    }`}>
      {/* Background blobs */}
      <motion.div animate={{ scale: [1,1.1,1], x:[0,30,0], y:[0,-20,0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -top-[10%] -left-[5%] h-[600px] w-[600px] rounded-full pointer-events-none ${
          isDarkMode ? "bg-[#00A3FF]/20 blur-[130px]" : "bg-[#00A3FF]/15 blur-[120px]"
        }`} />
      <motion.div animate={{ scale: [1,1.2,1], x:[0,-40,0], y:[0,30,0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className={`absolute -bottom-[10%] -right-[5%] h-[500px] w-[500px] rounded-full pointer-events-none ${
          isDarkMode ? "bg-[#01CBFF]/15 blur-[120px]" : "bg-blue-300/15 blur-[100px]"
        }`} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`relative z-10 flex w-full max-w-[900px] min-h-[520px] flex-col md:flex-row overflow-hidden rounded-3xl bg-white transition-all duration-700 ${
          isDarkMode ? "shadow-[0_25px_70px_rgba(0,0,0,0.4)] ring-1 ring-white/10"
                     : "shadow-[0_20px_60px_-15px_rgba(0,163,255,0.2)] ring-1 ring-slate-100"
        }`}>

        {/* Left panel */}
        <div className={`relative flex w-full md:w-[45%] flex-col justify-between p-12 overflow-hidden transition-colors duration-700 ${
          isDarkMode ? "bg-[#00A3FF]" : "bg-[#E6F4FF]"
        }`}>
          <div className={`absolute -top-24 -left-24 rotate-12 pointer-events-none ${isDarkMode ? "text-white/10" : "text-[#00A3FF]/5"}`}>
            <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z" />
            </svg>
          </div>
          <div className="relative z-10">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex items-center gap-3 mb-6">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${isDarkMode ? "bg-white text-[#00A3FF]" : "bg-[#00A3FF] text-white"}`}>
                <ShieldCheck size={22} strokeWidth={2} />
              </div>
              <h1 className={`text-xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-[#0B1B3D]"}`}>
                LAL Group Of Technologies
              </h1>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <h2 className={`text-2xl font-semibold leading-tight mb-4 ${isDarkMode ? "text-white" : "text-[#0B1B3D]"}`}>
                Master Accounts <br />
                <span className={isDarkMode ? "text-white/80" : "text-[#00A3FF]"}>Portal</span>
              </h2>
              <p className={`text-sm font-medium leading-relaxed ${isDarkMode ? "text-blue-100" : "text-slate-500"}`}>
                Secure multi-tenant access for authorized administrators, groups, and staff members.
              </p>
            </motion.div>
          </div>
          <div className="relative z-10 mt-12">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 border backdrop-blur-sm ${isDarkMode ? "bg-black/10 border-white/20" : "bg-[#00A3FF]/10 border-[#00A3FF]/20"}`}>
              <div className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
              <span className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-[#00A3FF]"}`}>
                System Active
              </span>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="relative flex w-full md:w-[55%] flex-col justify-center p-10 lg:p-14 bg-white">
          <button onClick={() => setIsDarkMode(!isDarkMode)}
            className="absolute top-6 right-6 p-2.5 rounded-full text-slate-600 hover:text-[#00A3FF] hover:bg-slate-200 transition-all active:scale-95 z-50">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="mb-8 mt-2">
            <h2 className="text-2xl font-bold text-[#0B1B3D]">Sign In</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Enter your username and password.</p>
          </div>

          <AnimatePresence mode="wait">
            {apiError && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600">
                <AlertCircle size={16} />
                <span className="text-xs font-semibold">{apiError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">
                Username
              </label>
              <div className={`relative flex items-center overflow-hidden rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${
                errors.username
                  ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15"
                  : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"
              }`}>
                <User size={18} className="absolute left-4 text-slate-400" />
                <input {...register("username")} type="text" placeholder="e.g. LT10001 or admin"
                  className="w-full bg-transparent py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none" />
              </div>
              {errors.username && <p className="text-xs text-red-500 ml-1">{errors.username.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">
                Password
              </label>
              <div className={`relative flex items-center overflow-hidden rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${
                errors.password
                  ? "border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15"
                  : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"
              }`}>
                <Lock size={18} className="absolute left-4 text-slate-400" />
                <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••"
                  className="w-full bg-transparent py-3.5 pl-11 pr-12 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-[#00A3FF]">
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>}
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3FF] py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,163,255,0.25)] hover:bg-[#008DE6] disabled:opacity-70 disabled:cursor-not-allowed transition-all">
              {isSubmitting ? "Authenticating…" : (
                <span className="flex items-center gap-2">
                  Access Portal <ArrowRight size={16} />
                </span>
              )}
            </motion.button>

          </form>
        </div>
      </motion.div>
    </div>
  );
}
