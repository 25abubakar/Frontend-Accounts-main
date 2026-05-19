import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Zap, Trash2 } from "lucide-react";
import { menuApi } from "../../api/menuApi";
import { useAuthStore } from "../../store/authStore";
import NoAccessMessage from "../../components/shared/NoAccessMessage";

// ── The full navigation structure to seed ────────────────────────────────
const MENU_STRUCTURE = [
  { title: "Overview",         icon: "LayoutDashboard", route: "/dashboard",        sortOrder: 1,  parent: null },
  { title: "Accounts & Groups",icon: "Building2",       route: null,                sortOrder: 2,  parent: null },
  { title: "HR Management",    icon: "Users",           route: null,                sortOrder: 3,  parent: null },
  { title: "Access Control",   icon: "Shield",          route: null,                sortOrder: 4,  parent: null },
  { title: "Platform Settings",icon: "Settings",        route: null,                sortOrder: 5,  parent: null },

  // Accounts & Groups children
  { title: "Companies & Entities", icon: "Building2",  route: "/groups/companies",  sortOrder: 1, parent: "Accounts & Groups" },
  { title: "Organization Chart",   icon: "Network",    route: "/organization",      sortOrder: 2, parent: "Accounts & Groups" },
  { title: "Partner Portals",      icon: "Globe2",     route: "/groups/partners",   sortOrder: 3, parent: "Accounts & Groups" },

  // HR Management children
  { title: "Staff & Persons",  icon: "Users",          route: "/hr/staff",          sortOrder: 1, parent: "HR Management" },
  { title: "Register Person",  icon: "UserCheck",      route: "/hr/staff/register", sortOrder: 2, parent: "HR Management" },
  { title: "Positions",        icon: "Briefcase",      route: "/hr/vacancies",      sortOrder: 3, parent: "HR Management" },
  { title: "Reports",          icon: "BarChart3",      route: "/hr/reports",        sortOrder: 4, parent: "HR Management" },

  // Access Control children
  { title: "Access Groups",    icon: "Layers",  route: "/access/groups",        sortOrder: 1, parent: "Access Control" },
  { title: "Group Matrix",     icon: "Shield",  route: "/access/groups/matrix", sortOrder: 2, parent: "Access Control" },
  { title: "Dept Permissions", icon: "Shield",  route: "/access/dept",          sortOrder: 3, parent: "Access Control" },

  // Platform Settings children
  { title: "General",          icon: "Settings",       route: "/settings/general",  sortOrder: 1, parent: "Platform Settings" },
  { title: "Branding",         icon: "Palette",        route: "/settings/branding", sortOrder: 2, parent: "Platform Settings" },
  { title: "Email Templates",  icon: "Mail",           route: "/settings/emails",   sortOrder: 3, parent: "Platform Settings" },
  { title: "Integrations",     icon: "Link",           route: "/settings/integrations", sortOrder: 4, parent: "Platform Settings" },
  { title: "Menu Manager",     icon: "LayoutGrid",     route: "/settings/menus",    sortOrder: 5, parent: "Platform Settings" },
];

type SeedStatus = "idle" | "running" | "done" | "error";

interface SeedLog {
  title: string;
  status: "ok" | "error";
  message?: string;
}

export default function MenuSeeder() {
  const [status, setStatus] = useState<SeedStatus>("idle");
  const [logs, setLogs] = useState<SeedLog[]>([]);
  const [clearing, setClearing] = useState(false);

  // Check if user is admin
  const userRoles = useAuthStore(s => s.userRoles);
  const isAdmin = userRoles.some(r =>
    ["admin", "superadmin", "super admin", "ceo", "dutyceo"].includes(r.toLowerCase())
  );

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <NoAccessMessage
        title="Admin Access Required"
        message="Only administrators can seed menu items. Contact your system administrator if you need access."
      />
    );
  }

  const addLog = (log: SeedLog) => setLogs(prev => [...prev, log]);

  const handleSeed = async () => {
    setStatus("running");
    setLogs([]);

    try {
      // Step 1: Get existing menus to avoid duplicates
      const existing = await menuApi.getSidebarTree();
      const existingTitles = new Set<string>();
      const flatExisting = (items: typeof existing) => {
        items.forEach(i => {
          existingTitles.add(i.title.toLowerCase());
          if (i.children) flatExisting(i.children);
        });
      };
      flatExisting(existing);

      // Step 2: Create root items first, collect their IDs
      const idMap: Record<string, number> = {};

      const roots = MENU_STRUCTURE.filter(m => m.parent === null);
      for (const item of roots) {
        if (existingTitles.has(item.title.toLowerCase())) {
          // Find existing ID
          const found = existing.find(e => e.title.toLowerCase() === item.title.toLowerCase());
          if (found) idMap[item.title] = found.id;
          addLog({ title: item.title, status: "ok", message: "Already exists — skipped" });
          continue;
        }
        try {
          const created = await menuApi.createMenu({
            title: item.title,
            icon: item.icon,
            route: item.route,
            parentId: null,
            sortOrder: item.sortOrder,
          });
          idMap[item.title] = created.id;
          addLog({ title: item.title, status: "ok", message: "Created" });
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } };
          addLog({ title: item.title, status: "error", message: err.response?.data?.message ?? "Failed" });
        }
      }

      // Step 3: Create children
      const children = MENU_STRUCTURE.filter(m => m.parent !== null);
      for (const item of children) {
        if (existingTitles.has(item.title.toLowerCase())) {
          addLog({ title: item.title, status: "ok", message: "Already exists — skipped" });
          continue;
        }
        const parentId = item.parent ? idMap[item.parent] : null;
        if (!parentId) {
          addLog({ title: item.title, status: "error", message: `Parent "${item.parent}" not found` });
          continue;
        }
        try {
          await menuApi.createMenu({
            title: item.title,
            icon: item.icon,
            route: item.route,
            parentId,
            sortOrder: item.sortOrder,
          });
          addLog({ title: item.title, status: "ok", message: `Created under "${item.parent}"` });
        } catch (e: unknown) {
          const err = e as { response?: { data?: { message?: string } } };
          addLog({ title: item.title, status: "error", message: err.response?.data?.message ?? "Failed" });
        }
      }

      // Notify sidebar to refresh
      window.dispatchEvent(new Event("navigation-updated"));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("This will delete ALL menu items. Are you sure?")) return;
    try {
      setClearing(true);
      const existing = await menuApi.getSidebarTree();

      // Delete children first, then parents
      const deleteAll = async (items: typeof existing) => {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            await deleteAll(item.children);
          }
          try { await menuApi.deleteMenu(item.id); } catch { /* ignore */ }
        }
      };
      await deleteAll(existing);
      window.dispatchEvent(new Event("navigation-updated"));
      setLogs([{ title: "All menus", status: "ok", message: "Cleared successfully" }]);
      setStatus("idle");
    } catch {
      setLogs([{ title: "Clear", status: "error", message: "Failed to clear menus" }]);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Zap size={20} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Menu Seeder</h1>
          </div>
          <p className="text-sm font-medium text-slate-400 ml-13">
            One-click setup — seeds all navigation items into the database.
            Run this once after a fresh install.
          </p>
        </div>

        {/* Preview of what will be seeded */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Navigation Structure ({MENU_STRUCTURE.length} items)
            </p>
          </div>
          <div className="p-4 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {MENU_STRUCTURE.filter(m => m.parent === null).map(root => (
              <div key={root.title}>
                <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg">
                  <span className="text-sm font-black text-slate-700">{root.title}</span>
                  {root.route && (
                    <span className="text-[10px] font-mono text-slate-400">{root.route}</span>
                  )}
                </div>
                {MENU_STRUCTURE.filter(m => m.parent === root.title).map(child => (
                  <div key={child.title} className="flex items-center gap-2 py-1 px-2 ml-5 rounded-lg">
                    <span className="text-slate-300">└</span>
                    <span className="text-xs font-semibold text-slate-600">{child.title}</span>
                    <span className="text-[10px] font-mono text-slate-400">{child.route}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleSeed}
            disabled={status === "running" || clearing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {status === "running"
              ? <><Loader2 size={16} className="animate-spin" /> Seeding…</>
              : <><Zap size={16} /> Seed Navigation</>
            }
          </button>
          <button
            onClick={handleClearAll}
            disabled={status === "running" || clearing}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
          >
            {clearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Clear All
          </button>
        </div>

        {/* Status banner */}
        {status === "done" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={16} /> Navigation seeded successfully! Sidebar has been refreshed.
          </motion.div>
        )}
        {status === "error" && (
          <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-bold text-red-600">
            <AlertCircle size={16} /> Something went wrong. Check the log below.
          </div>
        )}

        {/* Seed log */}
        {logs.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Seed Log</p>
            </div>
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  {log.status === "ok"
                    ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    : <AlertCircle size={14} className="text-red-500 shrink-0" />
                  }
                  <span className="text-sm font-bold text-slate-700 flex-1">{log.title}</span>
                  <span className={`text-xs font-semibold ${log.status === "ok" ? "text-slate-400" : "text-red-500"}`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
