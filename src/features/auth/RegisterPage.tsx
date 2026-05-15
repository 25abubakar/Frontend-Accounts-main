import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, EyeOff, Eye, ShieldCheck, ArrowRight, User, Briefcase, ChevronDown, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// Global Components & API
import SuccessPopup from "../../components/global/SuccessPopup";
import { AuthAPI } from "../../api/auth";
import type { RegisterDto } from "../../types";

// 1. Strict Validation Schema
const registerSchema = z.object({
  firstName: z.string().min(2, { message: "First name is required." }),
  lastName: z.string().min(2, { message: "Last name is required." }),
  role: z.string().min(1, { message: "Please select a role." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your password." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null); // Added Error State
  
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setApiError(null);

      const payload: RegisterDto = {
        email: data.email,
        password: data.password,
        confirmPassword: data.confirmPassword,
        role: data.role,
      };

      // Call the API
      await AuthAPI.register(payload);
      
      // Trigger Success Popup on successful 200 OK
      setShowSuccess(true);
      
    } catch (error: any) {
      // Handle backend validation errors (e.g., Duplicate Email, Weak Password)
      const message = error.response?.data?.message || "Registration failed. Please check your details or server connection.";
      setApiError(message);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center p-4 font-sans overflow-hidden bg-[#F8FAFC]">
      
      {/* SUCCESS POPUP COMPONENT */}
      <SuccessPopup 
        isOpen={showSuccess} 
        onClose={handleCloseSuccess}
        title="Account Created!"
        message="Your registration was successful. You can now log in to the LAL Group Master Portal with your credentials."
        autoClose={4000}
      />

      {/* AMBIENT BACKGROUND ORBS */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[10%] -left-[5%] h-[600px] w-[600px] rounded-full pointer-events-none bg-[#00A3FF]/15 blur-[120px]"
      />

      {/* MAIN CONTAINER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex w-full max-w-[1000px] min-h-[600px] flex-col md:flex-row overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_-15px_rgba(0,163,255,0.2)] ring-1 ring-slate-100"
      >
        {/* LEFT PANEL */}
        <div className="relative flex w-full md:w-[40%] flex-col justify-between p-12 overflow-hidden bg-[#E6F4FF]">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00A3FF] text-white shadow-sm">
                <ShieldCheck size={22} />
              </div>
              <h1 className="text-xl font-black tracking-tight text-[#0B1B3D]">LAL Group</h1>
            </div>
            <h2 className="text-2xl font-semibold leading-tight mb-4 text-[#0B1B3D]">
              Join the <br />
              <span className="text-[#00A3FF]">Master Portal</span>
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-500">
              Register to manage multi-tenant environments and secure system configurations.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Form */}
        <div className="relative flex w-full md:w-[60%] flex-col justify-center p-8 lg:p-12 bg-white">
          <div className="mb-6 mt-2">
            <h2 className="text-2xl font-bold text-[#0B1B3D]">Create Account</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Please fill in your details below.</p>
          </div>

          {/* BACKEND ERROR BANNER */}
          <AnimatePresence mode="wait">
            {apiError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="mb-6 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600"
              >
                <AlertCircle size={16} />
                <span className="text-xs font-semibold">{apiError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            
            {/* NAME ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">First Name</label>
                <div className={`relative flex items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${errors.firstName ? "border-red-400 focus-within:ring-red-500/15" : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"}`}>
                  <User size={16} className="absolute left-3.5 text-slate-400" />
                  <input {...register("firstName")} type="text" placeholder="Haseeb" className="w-full bg-transparent py-3 pl-10 pr-4 text-sm font-medium outline-none text-slate-900" />
                </div>
                {errors.firstName && <p className="text-[10px] text-red-500 ml-1 mt-1">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">Last Name</label>
                <div className={`relative flex items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${errors.lastName ? "border-red-400 focus-within:ring-red-500/15" : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"}`}>
                  <input {...register("lastName")} type="text" placeholder="Khan" className="w-full bg-transparent py-3 px-4 text-sm font-medium outline-none text-slate-900" />
                </div>
                {errors.lastName && <p className="text-[10px] text-red-500 ml-1 mt-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* ROLE & EMAIL ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">Account Role</label>
                <div className={`relative flex items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${errors.role ? "border-red-400 focus-within:ring-red-500/15" : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"}`}>
                  <Briefcase size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                  <select {...register("role")} className="w-full bg-transparent py-3 pl-10 pr-4 text-sm font-medium outline-none appearance-none cursor-pointer text-slate-900">
                    <option value="" disabled hidden>Select Role...</option>
                    {/* CRITICAL FIX: Values must match exactly what was seeded in Program.cs */}
                    <option value="Manager">Manager</option>
                    <option value="AssistantManager">Assistant Manager</option>
                    <option value="Developer">Developer</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-4 text-slate-400 pointer-events-none" />
                </div>
                {errors.role && <p className="text-[10px] text-red-500 ml-1 mt-1">{errors.role.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">Email Address</label>
                <div className={`relative flex items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${errors.email ? "border-red-400 focus-within:border-red-500/15" : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"}`}>
                  <Mail size={16} className="absolute left-3.5 text-slate-400" />
                  <input {...register("email")} type="email" placeholder="haseeb@lalgroup.com" className="w-full bg-transparent py-3 pl-10 pr-4 text-sm font-medium outline-none text-slate-900" />
                </div>
                {errors.email && <p className="text-[10px] text-red-500 ml-1 mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* PASSWORD ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">Password</label>
                <div className={`relative flex items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${errors.password ? "border-red-400 focus-within:border-red-500/15" : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"}`}>
                  <Lock size={16} className="absolute left-3.5 text-slate-400" />
                  <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-transparent py-3 pl-10 pr-4 text-sm font-medium outline-none text-slate-900" />
                </div>
                {errors.password && <p className="text-[10px] text-red-500 ml-1 mt-1">{errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500 ml-1">Confirm Password</label>
                <div className={`relative flex items-center rounded-xl border bg-slate-50 transition-all focus-within:bg-white focus-within:ring-4 ${errors.confirmPassword ? "border-red-400 focus-within:border-red-500/15" : "border-slate-200 focus-within:border-[#00A3FF] focus-within:ring-[#00A3FF]/15"}`}>
                  <Lock size={16} className="absolute left-3.5 text-slate-400" />
                  <input {...register("confirmPassword")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-transparent py-3 pl-10 pr-10 text-sm font-medium outline-none text-slate-900" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 text-slate-400 hover:text-[#00A3FF]">
                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-[10px] text-red-500 ml-1 mt-1">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00A3FF] py-3.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(0,163,255,0.25)] transition-all hover:bg-[#008DE6] disabled:opacity-70"
            >
              {isSubmitting ? "Creating Account..." : "Register"}
              {!isSubmitting && <ArrowRight size={16} />}
            </motion.button>

            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-slate-500">
                Already have an account?{" "}
                <button type="button" onClick={() => navigate("/login")} className="text-[#00A3FF] font-bold hover:underline">
                  Sign in
                </button>
              </p>
            </div>
            
          </form>
        </div>
      </motion.div>
    </div>
  );
}