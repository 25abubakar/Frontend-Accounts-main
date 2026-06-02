import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rbacApi, type SidebarItem } from '../../api/rbacApi';
import AddMenuModal from './AddMenuModal';
import { useAuthStore } from '../../store/authStore';
import { dedupeMenuTreeByRoute } from '../../lib/utils';

import {
  LayoutDashboard, Users, Settings, Briefcase, LineChart, Shield, BarChart3, Circle,
  Building2, MapPin, Globe2, Network, UserCheck, Layers, Lock, Key, Palette,
  Mail, Link, LayoutGrid, Zap as ZapIcon,
} from "lucide-react";

const IconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Settings, Briefcase, LineChart, Shield, BarChart3,
  Building2, MapPin, Globe2, Network, UserCheck, Layers, Lock, Key, Palette,
  Mail, Link, LayoutGrid, Zap: ZapIcon,
};

const getIcon = (iconName?: string | null) => {
  if (!iconName) return Circle;
  const k = Object.keys(IconMap).find(k => k.toLowerCase() === iconName.toLowerCase());
  return k ? IconMap[k] : Circle;
};

interface SidebarProps {
  themeColor: string;
  onNavClick?: () => void;
}

export default function Sidebar({ themeColor, onNavClick }: SidebarProps) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId]   = useState<number | null>(null);
  const [menuItems, setMenuItems]     = useState<SidebarItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [apiError, setApiError]             = useState(false);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userRoles       = useAuthStore(s => s.userRoles);

  // Admin/CEO bypass all menu filtering
  const isAdmin = userRoles.some(r =>
    ["admin","superadmin","super admin","ceo","dutyceo"].includes(r.toLowerCase())
  );

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(false);

      // ── ONLY source: GET /api/rbac/sidebar ──────────────────────────────
      // Backend filters by user permissions — trust it completely.
      // Empty [] = user has no access = show nothing (correct behaviour).
      const items = await rbacApi.getSidebar();
      setMenuItems(dedupeMenuTreeByRoute(items));

    } catch (err) {
      console.error("Failed to load sidebar:", err);
      setApiError(true);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchMenu();
    
    // Refetch sidebar when navigation is updated (e.g. admin adds a menu)
    window.addEventListener('navigation-updated', fetchMenu);
    
    // Clear sidebar immediately on logout
    const handleLogout = () => setMenuItems([]);
    window.addEventListener('user-logged-out', handleLogout);
    
    return () => {
      window.removeEventListener('navigation-updated', fetchMenu);
      window.removeEventListener('user-logged-out', handleLogout);
    };
  }, [fetchMenu, isAuthenticated]);

  const toggleMenu = (id: number) => setOpenMenuId(openMenuId === id ? null : id);

  const renderItem = (item: SidebarItem) => {
    // Skip items with no route and no children (orphaned DB entries)
    if (!item.route && (!item.children || item.children.length === 0)) return null;

    const isOpen      = openMenuId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const Icon        = getIcon(item.icon);

    // If item has no route but also no children, skip it
    const effectiveRoute = item.route || null;

    return (
      <div key={item.id} className="flex flex-col">
        {hasChildren ? (
          <button onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group ${
              isOpen ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-500/10'
                     : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
            }`}>
            <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-0.5">
              <Icon size={17} className={`transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>{item.title}</span>
            </div>
            <motion.div animate={{ rotate: isOpen ? -180 : 0 }} transition={{ duration: 0.3 }}
              className={isOpen ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-500'}>
              <ChevronDown size={14} strokeWidth={2.5} />
            </motion.div>
          </button>
        ) : effectiveRoute ? (
          <NavLink to={effectiveRoute} onClick={onNavClick}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                isActive ? `${themeColor} text-white shadow-md ring-1 ring-black/5`
                         : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`
            }>
            {({ isActive }) => (
              <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-0.5">
                <Icon size={17} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>{item.title}</span>
              </div>
            )}
          </NavLink>
        ) : (
          // No route, no children — render as disabled label (admin can delete it)
          <div className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-300 cursor-not-allowed select-none">
            <Icon size={17} className="text-slate-200" />
            <span>{item.title}</span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-slate-200">no route</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {hasChildren && isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="ml-7 mt-1 mb-1.5 space-y-0.5 border-l-2 border-slate-100 pl-2.5 py-0.5">
                {item.children?.map(sub => {
                  if (!sub.route) return null;
                  return (
                    <NavLink key={sub.id} to={sub.route} onClick={onNavClick}
                      className={({ isActive }) =>
                        `block w-full px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group ${
                          isActive ? 'text-blue-600 bg-blue-50/80 font-bold shadow-sm ring-1 ring-blue-500/10'
                                   : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`
                      }>
                      {({ isActive }) => (
                        <div className="flex items-center gap-2 transition-transform duration-200 group-hover:translate-x-1">
                          <div className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                            isActive ? 'bg-blue-500 scale-100 opacity-100'
                                     : 'bg-slate-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'
                          }`} />
                          {sub.title}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <aside className="w-full bg-white h-full border-r border-slate-100 flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-3 flex items-center justify-center border-b border-slate-100 shrink-0 bg-white">
        <img src="/1.png" alt="LAL Group"
          className="h-14 w-auto object-contain transition-transform duration-500 hover:scale-105" />
      </div>

      {/* API Error notice */}
      {apiError && !loading && (
        <div className="mx-3 mt-3 flex flex-col gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-red-500 shrink-0" />
            <span className="text-[10px] font-bold text-red-700 leading-tight">
              Failed to load menu from server
            </span>
          </div>
          <button onClick={fetchMenu}
            className="w-full rounded-lg bg-red-100 hover:bg-red-200 px-3 py-1.5 text-[10px] font-bold text-red-700 transition-colors">
            Retry
          </button>
          {isAdmin && (
            <div className="mt-1 pt-2 border-t border-red-200">
              <button onClick={() => navigate("/settings/seed-menus")}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 px-3 py-1.5 text-[10px] font-bold text-amber-700 transition-colors">
                <Zap size={12} /> Seed Database Menus
              </button>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin text-slate-300" size={24} />
          </div>
        ) : menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Shield size={32} className="text-slate-200 mb-3" />
            <p className="text-xs font-bold text-slate-400">No menu access</p>
            <p className="text-[10px] text-slate-300 mt-1">Contact your administrator</p>
          </div>
        ) : (
          menuItems.map(item => renderItem(item))
        )}
      </nav>

      {/* Add Menu button - Only for Admins */}
      {isAdmin && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
          <button onClick={() => setIsAddModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-xl text-sm font-bold transition-colors">
            <Plus size={16} strokeWidth={3} /> Add Menu Item
          </button>
        </div>
      )}

      <AddMenuModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchMenu} />
    </aside>
  );
}
