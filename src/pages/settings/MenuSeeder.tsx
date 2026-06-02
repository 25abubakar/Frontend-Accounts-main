import { useState } from "react";
import { motion } from "framer-motion";
import {
  Loader2, CheckCircle2, AlertCircle, Zap, Trash2,
  Database, ChevronRight, Info,
} from "lucide-react";
import { menuApi } from "../../api/menuApi";
import { useAuthStore } from "../../store/authStore";
import NoAccessMessage from "../../components/shared/NoAccessMessage";

// ── Permission map — mirrors backend SeedMenus logic ────────────────────
// Used only for the preview table; actual seeding happens on the backend.
const MENU_PREVIEW = [
  // ── Root items ──────────────────────────────────────────────────────────
  { title: "Overview",          route: "/dashboard",           parent: null,               permission: "(public — all users)",          icon: "LayoutDashboard", sortOrder: 1 },
  { title: "Accounts & Groups", route: null,                   parent: null,               permission: "",                               icon: "Building2",       sortOrder: 2 },
  { title: "HR Management",     route: null,                   parent: null,               permission: "",                               icon: "Users",           sortOrder: 3 },
  { title: "Access Control",    route: null,                   parent: null,               permission: "",                               icon: "Shield",          sortOrder: 4 },
  { title: "Platform Settings", route: null,                   parent: null,               permission: "",                               icon: "Settings",        sortOrder: 5 },

  // ── Accounts & Groups children ──────────────────────────────────────────
  { title: "Companies & Entities", route: "/groups/companies",  parent: "Accounts & Groups", permission: "DEPT_VIEW",                   icon: "Building2",  sortOrder: 1 },
  { title: "Organization Chart",   route: "/organization",      parent: "Accounts & Groups", permission: "DEPT_VIEW",                   icon: "Network",    sortOrder: 2 },
  { title: "Partner Portals",      route: "/groups/partners",   parent: "Accounts & Groups", permission: "DEPT_VIEW",                   icon: "Globe2",     sortOrder: 3 },

  // ── HR Management children ───────────────────────────────────────────────
  { title: "Staff & Persons",  route: "/hr/staff",          parent: "HR Management", permission: "EMPLOYEE_VIEW or PERSON_VIEW",   icon: "Users",      sortOrder: 1 },
  { title: "Register Person",  route: "/hr/staff/register", parent: "HR Management", permission: "PERSON_REGISTER",                icon: "UserCheck",  sortOrder: 2 },
  { title: "Positions",        route: "/hr/vacancies",      parent: "HR Management", permission: "VACANCY_VIEW",                   icon: "Briefcase",  sortOrder: 3 },
  { title: "Reports",          route: "/hr/reports",        parent: "HR Management", permission: "EMPLOYEE_VIEW",                  icon: "BarChart3",  sortOrder: 4 },

  // ── Access Control children ──────────────────────────────────────────────
  { title: "Admin Access",     route: "/access/admin",          parent: "Access Control", permission: "ACCESS_GROUP_VIEW",           icon: "Shield",     sortOrder: 1 },
  { title: "Access Groups",    route: "/access/groups",         parent: "Access Control", permission: "ACCESS_GROUP_VIEW",           icon: "Layers",     sortOrder: 2 },
  { title: "Group Matrix",     route: "/access/groups/matrix",  parent: "Access Control", permission: "ACCESS_GROUP_VIEW",           icon: "Shield",     sortOrder: 3 },
  { title: "Dept Permissions", route: "/access/dept",           parent: "Access Control", permission: "ACCESS_GROUP_VIEW",           icon: "Shield",     sortOrder: 4 },

  // ── Platform Settings children ───────────────────────────────────────────
  { title: "General",        route: "/settings/general",      parent: "Platform Settings", permission: "ACCESS_GROUP_VIEW",          icon: "Settings",   sortOrder: 1 },
  { title: "Branding",       route: "/settings/branding",     parent: "Platform Settings", permission: "ACCESS_GROUP_VIEW",          icon: "Palette",    sortOrder: 2 },
  { title: "Email Templates",route: "/settings/emails",       parent: "Platform Settings", permission: "ACCESS_GROUP_VIEW",          icon: "Mail",       sortOrder: 3 },
  { title: "Integrations",   route: "/settings/integrations", parent: "Platform Settings", permission: "ACCESS_GROUP_VIEW",          icon: "Link",       sortOrder: 4 },
  { title: "Menu Manager",   route: "/settings/menus",        parent: "Platform Settings", permission: "ACCESS_GROUP_EDIT",          icon: "LayoutGrid", sortOrder: 5 },
  { title: "Seed Menus",     route: "/settings/seed-menus",   parent: "Platform Settings", permission: "ACCESS_GROUP_EDIT",          icon: "Zap",        sortOrder: 6 },
];

type SeedStatus = "idle" | "running" | "done" | "error";

interface SeedLog {
  title: string;
  status: "ok" | "warn" | "error";
  message?: string;
}

export default function MenuSeeder() {
  const [status, setStatus]   = useState<SeedStatus>("idle");
  const [logs, setLogs]       = useState<SeedLog[]>([]);
  const [clearing, setClearing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const userRoles = useAuthStore(s => s.userRoles);
  const isAdmin = userRoles.some(r =>
    ["admin", "superadmin", "super admin", "ceo", "dutyceo"].includes(r.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <NoAccessMessage
        title="Admin Access Required"
        message="Only administrators can seed menu items. Contact your system administrator if you need access."
      />
    );
  }

  const addLog = (log: SeedLog) => setLogs(prev => [...prev, log]);

  // ── Primary path: single backend seed endpoint ───────────────────────────
  const handleSeed = async () => {
    setStatus("running");
    setLogs([]);

    try {
      const result = await menuApi.seedMenus();

      if (result.seeded !== undefined) {
        addLog({ title: "Seed complete", status: "ok",  message: `${result.seeded} created, ${result.skipped} skipped, ${result.errors} errors` });
        if (result.message) addLog({ title: "Server", status: "ok", message: result.message });
      } else {
        addLog({ title: "Seed complete", status: "ok", message: "Backend seeded successfully" });
      }

      window.dispatchEvent(new Event("navigation-updated"));
      setStatus("done");

    } catch (err: unknown) {
      // Fallback: manual item-by-item creation (for backends that don't yet have /api/menus/seed)
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        addLog({ title: "Notice", status: "warn", message: "/api/menus/seed not found — falling back to manual creation" });
        await seedManually();
      } else {
        addLog({ title: "Error", status: "error", message: err instanceof Error ? err.message : "Seed failed" });
        setStatus("error");
      }
    }
  };

  // ── Fallback: create menus one-by-one via /api/Menus ────────────────────
  const seedManually = async () => {
    try {
      const existing   = await menuApi.getSidebarTree();
      const seenTitles = new Set<string>();
      const flatten    = (items: typeof existing) => {
        items.forEach(i => {
          seenTitles.add(i.title.toLowerCase());
          if (i.children) flatten(i.children);
        });
      };
      flatten(existing);

      const idMap: Record<string, number> = {};

      // Create roots first
      for (const item of MENU_PREVIEW.filter(m => m.parent === null)) {
        if (seenTitles.has(item.title.toLowerCase())) {
          const found = existing.find(e => e.title.toLowerCase() === item.title.toLowerCase());
          if (found) idMap[item.title] = found.id;
          addLog({ title: item.title, status: "warn", message: "Already exists — skipped" });
          continue;
        }
        try {
          const created = await menuApi.createMenu({
            title: item.title, icon: item.icon, route: item.route, parentId: null, sortOrder: item.sortOrder,
          });
          idMap[item.title] = created.id;
          addLog({ title: item.title, status: "ok", message: "Created" });
        } catch (e: unknown) {
          const axErr = e as { response?: { data?: { message?: string } } };
          addLog({ title: item.title, status: "error", message: axErr.response?.data?.message ?? "Failed" });
        }
      }

      // Create children
      for (const item of MENU_PREVIEW.filter(m => m.parent !== null)) {
        if (seenTitles.has(item.title.toLowerCase())) {
          addLog({ title: item.title, status: "warn", message: "Already exists — skipped" });
          continue;
        }
        const parentId = item.parent ? idMap[item.parent] : null;
        if (!parentId) {
          addLog({ title: item.title, status: "error", message: `Parent "${item.parent}" not found` });
          continue;
        }
        try {
          await menuApi.createMenu({
            title: item.title, icon: item.icon, route: item.route, parentId, sortOrder: item.sortOrder,
          });
          addLog({ title: item.title, status: "ok", message: `Under "${item.parent}"` });
        } catch (e: unknown) {
          const axErr = e as { response?: { data?: { message?: string } } };
          addLog({ title: item.title, status: "error", message: axErr.response?.data?.message ?? "Failed" });
        }
      }

      window.dispatchEvent(new Event("navigation-updated"));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  // ── Clear all menus ──────────────────────────────────────────────────────
  const handleClearAll = async () => {
    if (!window.confirm("This will delete ALL menu items from the database. Are you sure?")) return;
    try {
      setClearing(true);
      const existing = await menuApi.getSidebarTree();
      const deleteAll = async (items: typeof existing) => {
        for (const item of items) {
          if (item.children?.length) await deleteAll(item.children);
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

  const roots = MENU_PREVIEW.filter(m => m.parent === null);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-5 lg:p-8 custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 border border-amber-100">
            <Database size={22} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Menu Seeder</h1>
            <p className="mt-1 text-sm font-medium text-slate-400">
              Populates the database with the full navigation structure, permission keys, and parent–child hierarchy.
              Run once after a fresh install.
            </p>
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3.5 flex gap-3">
          <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold text-blue-700 space-y-1">
            <p><span className="font-black">Step 1:</span> Calls <code className="bg-blue-100 px-1 rounded font-mono">POST /api/menus/seed</code> — backend saves all menus with permission keys.</p>
            <p><span className="font-black">Step 2:</span> Frontend calls <code className="bg-blue-100 px-1 rounded font-mono">GET /api/rbac/sidebar</code> — backend returns only menus the user can see.</p>
            <p><span className="font-black">Result:</span> SuperAdmin sees all menus · Staff see only their permitted items.</p>
          </div>
        </div>

        {/* ── Preview table ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Navigation Structure — {MENU_PREVIEW.length} items
            </p>
            <span className="text-[10px] font-bold text-slate-400">{roots.length} parent groups</span>
          </div>

          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto custom-scrollbar">
            {roots.map(root => {
              const children = MENU_PREVIEW.filter(m => m.parent === root.title);
              const isOpen   = expanded === root.title;
              return (
                <div key={root.title}>
                  {/* Parent row */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : root.title)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <ChevronRight size={13} className={`text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <span className="text-sm font-black text-slate-800 flex-1">{root.title}</span>
                    {root.route && <span className="text-[10px] font-mono text-slate-400">{root.route}</span>}
                    {children.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">{children.length} children</span>
                    )}
                  </button>

                  {/* Children rows */}
                  {isOpen && children.map(child => (
                    <div key={child.title}
                      className="flex items-center gap-3 px-5 py-2.5 pl-12 bg-slate-50/60 border-t border-slate-100">
                      <span className="text-slate-300 text-sm">└</span>
                      <span className="text-xs font-semibold text-slate-700 flex-1">{child.title}</span>
                      <span className="text-[10px] font-mono text-slate-400 mr-3">{child.route}</span>
                      {child.permission && (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                          {child.permission}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            disabled={status === "running" || clearing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3.5 text-sm font-black text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {status === "running"
              ? <><Loader2 size={16} className="animate-spin" /> Seeding…</>
              : <><Zap size={16} /> Seed Navigation to Database</>
            }
          </button>
          <button
            onClick={handleClearAll}
            disabled={status === "running" || clearing}
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-all disabled:opacity-50"
          >
            {clearing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Clear All
          </button>
        </div>

        {/* ── Status banners ── */}
        {status === "done" && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} />
            Navigation seeded — sidebar will refresh automatically.
          </motion.div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-bold text-red-600">
            <AlertCircle size={18} />
            Seed failed. Ensure the backend is running and the endpoint exists. See log below.
          </div>
        )}

        {/* ── Seed log ── */}
        {logs.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Seed Log</p>
              <span className="text-[10px] font-bold text-slate-400">{logs.length} entries</span>
            </div>
            <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  {log.status === "ok"    && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                  {log.status === "warn"  && <Info         size={14} className="text-amber-500  shrink-0" />}
                  {log.status === "error" && <AlertCircle  size={14} className="text-red-500    shrink-0" />}
                  <span className="text-sm font-bold text-slate-700 flex-1">{log.title}</span>
                  <span className={`text-xs font-semibold ${
                    log.status === "ok"    ? "text-slate-400" :
                    log.status === "warn"  ? "text-amber-600" : "text-red-500"
                  }`}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
