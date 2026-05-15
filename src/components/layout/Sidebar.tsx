import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2, Plus, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { menuApi, type ApiMenuItem } from '../../api/menuApi';
import AddMenuModal from './AddMenuModal';

import {
  LayoutDashboard, Users, Settings, Briefcase, LineChart, Shield, BarChart3, Circle,
  Building2, MapPin, Globe2, Network, UserCheck, Layers, Lock, Key, Palette,
  Mail, Link, LayoutGrid,
} from "lucide-react";

const IconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Settings, Briefcase, LineChart, Shield, BarChart3,
  Building2, MapPin, Globe2, Network, UserCheck, Layers, Lock, Key, Palette,
  Mail, Link, LayoutGrid,
};

const getIcon = (iconName?: string | null) => {
  if (!iconName) return Circle;
  const matchedKey = Object.keys(IconMap).find(k => k.toLowerCase() === iconName.toLowerCase());
  return matchedKey ? IconMap[matchedKey] : Circle;
};

// ── Static fallback nav (shown when DB has no menus yet) ─────────────────
const STATIC_NAV: ApiMenuItem[] = [
  { id: -1,  title: "Overview",          icon: "LayoutDashboard", route: "/dashboard",           sortOrder: 1, parentId: null },
  {
    id: -2, title: "Accounts & Groups", icon: "Building2",       route: null, sortOrder: 2, parentId: null,
    children: [
      { id: -21, title: "Companies & Entities", icon: "Building2", route: "/groups/companies",  sortOrder: 1, parentId: -2 },
      { id: -22, title: "Organization Chart",   icon: "Network",   route: "/organization",       sortOrder: 2, parentId: -2 },
      { id: -23, title: "Partner Portals",      icon: "Globe2",    route: "/groups/partners",    sortOrder: 3, parentId: -2 },
    ],
  },
  {
    id: -3, title: "HR Management",     icon: "Users",           route: null, sortOrder: 3, parentId: null,
    children: [
      { id: -31, title: "Staff & Persons",  icon: "Users",      route: "/hr/staff",          sortOrder: 1, parentId: -3 },
      { id: -32, title: "Register Person",  icon: "UserCheck",  route: "/hr/staff/register", sortOrder: 2, parentId: -3 },
      { id: -33, title: "Positions",        icon: "Briefcase",  route: "/hr/vacancies",      sortOrder: 3, parentId: -3 },
      { id: -34, title: "Reports",          icon: "BarChart3",  route: "/hr/reports",        sortOrder: 4, parentId: -3 },
    ],
  },
  {
    id: -4, title: "Access Control",    icon: "Shield",          route: null, sortOrder: 4, parentId: null,
    children: [
      { id: -41, title: "Access Groups",    icon: "Layers",  route: "/access/groups",       sortOrder: 1, parentId: -4 },
      { id: -42, title: "Dept Permissions", icon: "Shield",  route: "/access/department/1", sortOrder: 2, parentId: -4 },
    ],
  },
  {
    id: -5, title: "Platform Settings", icon: "Settings",        route: null, sortOrder: 5, parentId: null,
    children: [
      { id: -51, title: "General",        icon: "Settings",    route: "/settings/general",      sortOrder: 1, parentId: -5 },
      { id: -52, title: "Branding",       icon: "Palette",     route: "/settings/branding",     sortOrder: 2, parentId: -5 },
      { id: -53, title: "Email Templates",icon: "Mail",        route: "/settings/emails",       sortOrder: 3, parentId: -5 },
      { id: -54, title: "Integrations",   icon: "Link",        route: "/settings/integrations", sortOrder: 4, parentId: -5 },
      { id: -55, title: "Menu Manager",   icon: "LayoutGrid",  route: "/settings/menus",        sortOrder: 5, parentId: -5 },
      { id: -56, title: "Seed Menus",     icon: "Zap",         route: "/settings/seed-menus",   sortOrder: 6, parentId: -5 },
    ],
  },
];

interface SidebarProps {
  themeColor: string;
  onNavClick?: () => void;
}

export default function Sidebar({ themeColor, onNavClick }: SidebarProps) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const data = await menuApi.getSidebarTree();
      const items = Array.isArray(data) ? data : [];
      if (items.length === 0) {
        // No menus in DB — use static fallback
        setMenuItems(STATIC_NAV);
        setUsingFallback(true);
      } else {
        setMenuItems(items);
        setUsingFallback(false);
      }
    } catch {
      // API unreachable — use static fallback
      setMenuItems(STATIC_NAV);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();
    window.addEventListener('navigation-updated', fetchMenu);
    return () => window.removeEventListener('navigation-updated', fetchMenu);
  }, [fetchMenu]);

  const toggleMenu = (id: number) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const renderItem = (item: ApiMenuItem) => {
    const isOpen = openMenuId === item.id;
    const hasDropdown = item.children && item.children.length > 0;
    const Icon = getIcon(item.icon);

    return (
      <div key={item.id} className="flex flex-col">
        {hasDropdown ? (
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ease-out group
              ${isOpen
                ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-500/10'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
          >
            <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-0.5">
              <Icon size={17} className={`transition-colors ${isOpen ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span>{item.title}</span>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? -180 : 0 }}
              transition={{ duration: 0.3 }}
              className={isOpen ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-500'}
            >
              <ChevronDown size={14} strokeWidth={2.5} />
            </motion.div>
          </button>
        ) : (
          <NavLink
            to={item.route || "#"}
            onClick={onNavClick}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 group
              ${isActive
                ? `${themeColor} text-white shadow-md ring-1 ring-black/5`
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`
            }
          >
            {({ isActive }) => (
              <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-0.5">
                <Icon size={17} className={`transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>{item.title}</span>
              </div>
            )}
          </NavLink>
        )}

        <AnimatePresence initial={false}>
          {hasDropdown && isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-7 mt-1 mb-1.5 space-y-0.5 border-l-2 border-slate-100 pl-2.5 py-0.5">
                {item.children?.map(sub => (
                  <NavLink
                    key={sub.id}
                    to={sub.route || "#"}
                    onClick={onNavClick}
                    className={({ isActive }) =>
                      `block w-full px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-200 group
                      ${isActive
                        ? 'text-blue-600 bg-blue-50/80 font-bold shadow-sm ring-1 ring-blue-500/10'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`
                    }
                  >
                    {({ isActive }) => (
                      <div className="flex items-center gap-2 transition-transform duration-200 group-hover:translate-x-1">
                        <div className={`h-1.5 w-1.5 rounded-full transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-500 scale-100 opacity-100'
                            : 'bg-slate-300 scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100'
                        }`} />
                        {sub.title}
                      </div>
                    )}
                  </NavLink>
                ))}
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
        <img
          src="/1.png"
          alt="LAL Group"
          className="h-14 w-auto object-contain transition-transform duration-500 hover:scale-105"
        />
      </div>

      {/* Fallback notice */}
      {usingFallback && !loading && (
        <div
          onClick={() => navigate("/settings/seed-menus")}
          className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 cursor-pointer hover:bg-amber-100 transition-colors"
        >
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
          menuItems.map(item => renderItem(item))
        )}
      </nav>

      {/* Bottom: Add Menu button */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-200 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} strokeWidth={3} />
          Add Menu Item
        </button>
      </div>

      <AddMenuModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchMenu}
      />
    </aside>
  );
}
