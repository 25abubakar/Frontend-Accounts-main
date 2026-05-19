import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { rbacApi, type SidebarItem } from '../../api/rbacApi';
import { menuApi, type ApiMenuItem } from '../../api/menuApi';
import AddMenuModal from './AddMenuModal';
import { useAuthStore } from '../../store/authStore';

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

// ── Static fallback (used only when RBAC sidebar fails) ───────────────────
const STATIC_NAV: SidebarItem[] = [
  { id: -1,  title: "Overview",          icon: "LayoutDashboard", route: "/dashboard",           sortOrder: 1, children: [] },
  { id: -2,  title: "Accounts & Groups", icon: "Building2",       route: null,                   sortOrder: 2, children: [
    { id: -21, title: "Companies & Entities", icon: "Building2", route: "/groups/companies",  sortOrder: 1, children: [] },
    { id: -22, title: "Organization Chart",   icon: "Network",   route: "/organization",       sortOrder: 2, children: [] },
    { id: -23, title: "Partner Portals",      icon: "Globe2",    route: "/groups/partners",    sortOrder: 3, children: [] },
  ]},
  { id: -3,  title: "HR Management",     icon: "Users",           route: null,                   sortOrder: 3, children: [
    { id: -31, title: "Staff & Persons",  icon: "Users",      route: "/hr/staff",          sortOrder: 1, children: [] },
    { id: -32, title: "Register Person",  icon: "UserCheck",  route: "/hr/staff/register", sortOrder: 2, children: [] },
    { id: -33, title: "Positions",        icon: "Briefcase",  route: "/hr/vacancies",      sortOrder: 3, children: [] },
    { id: -34, title: "Reports",          icon: "BarChart3",  route: "/hr/reports",        sortOrder: 4, children: [] },
  ]},
  { id: -4,  title: "Access Control",    icon: "Shield",          route: null,                   sortOrder: 4, children: [
    { id: -41, title: "Access Groups",    icon: "Layers",  route: "/access/groups",        sortOrder: 1, children: [] },
    { id: -42, title: "Group Matrix",     icon: "Shield",  route: "/access/groups/matrix", sortOrder: 2, children: [] },
    { id: -43, title: "Dept Permissions", icon: "Shield",  route: "/access/dept",          sortOrder: 3, children: [] },
  ]},
  { id: -5,  title: "Platform Settings", icon: "Settings",        route: null,                   sortOrder: 5, children: [
    { id: -51, title: "General",        icon: "Settings",    route: "/settings/general",      sortOrder: 1, children: [] },
    { id: -52, title: "Branding",       icon: "Palette",     route: "/settings/branding",     sortOrder: 2, children: [] },
    { id: -53, title: "Email Templates",icon: "Mail",        route: "/settings/emails",       sortOrder: 3, children: [] },
    { id: -54, title: "Integrations",   icon: "Link",        route: "/settings/integrations", sortOrder: 4, children: [] },
    { id: -55, title: "Menu Manager",   icon: "LayoutGrid",  route: "/settings/menus",        sortOrder: 5, children: [] },
    { id: -56, title: "Seed Menus",     icon: "Zap",         route: "/settings/seed-menus",   sortOrder: 6, children: [] },
  ]},
];

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
  const [usingFallback, setUsingFallback]   = useState(false);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userPermissions = useAuthStore(s => s.userPermissions);
  const userRoles       = useAuthStore(s => s.userRoles);

  // Admin/CEO bypass all menu filtering
  const isAdmin = userRoles.some(r =>
    ["admin","superadmin","super admin","ceo","dutyceo"].includes(r.toLowerCase())
  );

  // Filter a SidebarItem by MENU_* permissions
  // If userPermissions is empty → show all (not loaded yet or admin)
  const canSeeItem = (item: SidebarItem): boolean => {
    if (isAdmin) return true;
    // If no MENU_ permissions exist at all → show everything (permissions not loaded)
    const hasMenuPerms = userPermissions.some(p => p.startsWith("MENU_"));
    if (!hasMenuPerms) return true;
    // Check if this item's id is in the allowed MENU_ keys
    const key = `MENU_${item.id}`;
    return userPermissions.includes(key);
  };

  // Recursively filter items
  const filterItems = (items: SidebarItem[]): SidebarItem[] => {
    return items
      .map(item => {
        if (item.children && item.children.length > 0) {
          const visibleChildren = filterItems(item.children);
          // Parent visible if it has visible children OR it has its own permission
          if (visibleChildren.length === 0 && !canSeeItem(item)) return null;
          return { ...item, children: visibleChildren };
        }
        // Leaf item
        if (!item.route) return null;
        return canSeeItem(item) ? item : null;
      })
      .filter((i): i is SidebarItem => i !== null);
  };

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      // Primary: RBAC-filtered sidebar
      const items = await rbacApi.getSidebar();
      if (items.length > 0) {
        // Filter out items with no route and no children
        const filtered = items.filter(i => i.route || (i.children && i.children.length > 0));
        setMenuItems(filtered.length > 0 ? filtered : STATIC_NAV);
        setUsingFallback(filtered.length === 0);
      } else {
        // Fallback: try the menu API
        const menuData = await menuApi.getSidebarTree();
        const arr = Array.isArray(menuData) ? menuData : [];
        if (arr.length > 0) {
          // Convert ApiMenuItem → SidebarItem shape
          const convert = (m: ApiMenuItem): SidebarItem => ({
            id: m.id,
            title: m.title,
            icon: m.icon ?? null,
            route: m.route ?? null,
            sortOrder: m.sortOrder,
            children: (m.children ?? []).map(convert),
          });
          setMenuItems(arr.map(convert));
          setUsingFallback(false);
        } else {
          setMenuItems(STATIC_NAV);
          setUsingFallback(true);
        }
      }
    } catch {
      setMenuItems(STATIC_NAV);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchMenu();
    window.addEventListener('navigation-updated', fetchMenu);
    return () => window.removeEventListener('navigation-updated', fetchMenu);
  }, [fetchMenu, isAuthenticated]);

  const toggleMenu = (id: number) => setOpenMenuId(openMenuId === id ? null : id);

  // Apply MENU permission filter
  const visibleItems = filterItems(menuItems);

  const renderItem = (item: SidebarItem) => {
    // Skip items with no route and no children
    if (!item.route && (!item.children || item.children.length === 0)) return null;

    const isOpen     = openMenuId === item.id;
    const hasChildren = item.children && item.children.length > 0;
    const Icon       = getIcon(item.icon);

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
        ) : (
          <NavLink to={item.route!} onClick={onNavClick}
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

      {/* Fallback notice */}
      {usingFallback && !loading && (
        <div onClick={() => navigate("/settings/seed-menus")}
          className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 cursor-pointer hover:bg-amber-100 transition-colors">
          <Zap size={13} className="text-amber-500 shrink-0" />
          <span className="text-[10px] font-bold text-amber-700 leading-tight">
            Using static nav. Click to seed DB menus.
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin text-slate-300" size={24} />
          </div>
        ) : (
          visibleItems.map(item => renderItem(item))
        )}
      </nav>

      {/* Add Menu button */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
        <button onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-xl text-sm font-bold transition-colors">
          <Plus size={16} strokeWidth={3} /> Add Menu Item
        </button>
      </div>

      <AddMenuModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={fetchMenu} />
    </aside>
  );
}
