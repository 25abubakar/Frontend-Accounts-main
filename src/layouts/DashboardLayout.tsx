import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { LayoutDashboard, Users, Briefcase, Settings, Menu, ShieldX, X } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { rbacApi } from "../api/rbacApi";
import { motion, AnimatePresence } from "framer-motion";

const BOTTOM_NAV = [
  { label: "Overview",  path: "/dashboard",       icon: LayoutDashboard },
  { label: "Staff",     path: "/hr/staff",         icon: Users },
  { label: "Positions", path: "/hr/vacancies",     icon: Briefcase },
  { label: "Settings",  path: "/settings/general", icon: Settings },
];

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themeColor, setThemeColor]       = useState("bg-blue-600");
  const [permDeniedMsg, setPermDeniedMsg] = useState<string | null>(null);

  const { isAuthenticated, staffId, setPermissions } = useAuthStore();

  // ── Fetch effective permissions after login ───────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !staffId) return;
    rbacApi.getEffectivePermissions(staffId)
      .then(perms => {
        const keys = perms.filter(p => p.hasAccess).map(p => p.featureKey);
        setPermissions(keys);
      })
      .catch(() => { /* silent — permissions stay empty, all nav visible */ });
  }, [isAuthenticated, staffId, setPermissions]);

  // ── Listen for 403 permission-denied events from axios interceptor ────
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      setPermDeniedMsg(msg);
      setTimeout(() => setPermDeniedMsg(null), 5000);
    };
    window.addEventListener('permission-denied', handler);
    return () => window.removeEventListener('permission-denied', handler);
  }, []);

  // ── Sidebar responsive ────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);
  const closeSidebar  = () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); };

  return (
    <div className="flex h-[100dvh] w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">

      {/* ── SIDEBAR ── */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        bg-white shadow-[0_0_40px_rgba(0,0,0,0.10)]
        transition-transform duration-300 ease-in-out
        w-64 shrink-0
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"}
      `}>
        <Sidebar themeColor={themeColor} onNavClick={closeSidebar} />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {isSidebarOpen && (
        <div onClick={closeSidebar}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" />
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} themeColor={themeColor} setThemeColor={setThemeColor} />

        {/* Permission denied toast */}
        <AnimatePresence>
          {permDeniedMsg && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="shrink-0 mx-4 mt-3 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3 shadow-sm z-30"
            >
              <ShieldX size={16} className="text-red-500 shrink-0" />
              <p className="flex-1 text-sm font-semibold text-red-700">{permDeniedMsg}</p>
              <button onClick={() => setPermDeniedMsg(null)} className="text-red-400 hover:text-red-600">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 md:p-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:pb-3">
          <div className="h-full w-full bg-white rounded-xl shadow-sm overflow-hidden">
            <Outlet />
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="lg:hidden shrink-0 flex items-center justify-around bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {BOTTOM_NAV.map(({ label, path, icon: Icon }) => (
            <NavLink key={path} to={path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[56px] ${
                  isActive ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-blue-50" : ""}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className="text-[10px] font-bold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={toggleSidebar}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-slate-400 hover:text-slate-600 min-w-[56px]">
            <div className="p-1.5 rounded-xl"><Menu size={20} strokeWidth={1.8} /></div>
            <span className="text-[10px] font-bold">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
