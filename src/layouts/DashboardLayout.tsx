import { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import {
  LayoutDashboard, Users, Briefcase, Settings, Menu,
} from "lucide-react";

// ── Mobile bottom nav items ───────────────────────────────
const BOTTOM_NAV = [
  { label: "Overview",  path: "/dashboard",        icon: LayoutDashboard },
  { label: "Directory", path: "/groups/companies",  icon: Users },
  { label: "HR",        path: "/groups/staff",      icon: Briefcase },
  { label: "Settings",  path: "/settings/general",  icon: Settings },
];

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [themeColor, setThemeColor] = useState("bg-blue-600");

  // On desktop (≥1024px) sidebar starts open; on mobile it starts closed
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(v => !v);
  const closeSidebar  = () => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden relative">

      {/* ── SIDEBAR ──────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          bg-white shadow-[0_0_40px_rgba(0,0,0,0.10)]
          transition-transform duration-300 ease-in-out
          w-64 shrink-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"}
        `}
      >
        <Sidebar themeColor={themeColor} onNavClick={closeSidebar} />
      </aside>

      {/* ── MOBILE OVERLAY ───────────────────────────────── */}
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Navbar */}
        <Navbar
          toggleSidebar={toggleSidebar}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
        />

        {/* Page content — leaves room for mobile bottom nav */}
        <main className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3 md:p-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:pb-3">
          <div className="h-full w-full bg-white rounded-xl shadow-sm overflow-hidden">
            <Outlet />
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV (hidden on lg+) ─────────── */}
        <nav className={`
          lg:hidden shrink-0 flex items-center justify-around
          bg-white border-t border-slate-200
          shadow-[0_-4px_20px_rgba(0,0,0,0.06)]
          px-2 pt-2
          pb-[calc(0.5rem+env(safe-area-inset-bottom))]
        `}>
          {BOTTOM_NAV.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all min-w-[56px] ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
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

          {/* Menu button — opens sidebar on mobile */}
          <button
            onClick={toggleSidebar}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-slate-400 hover:text-slate-600 min-w-[56px]"
          >
            <div className="p-1.5 rounded-xl">
              <Menu size={20} strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-bold">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}