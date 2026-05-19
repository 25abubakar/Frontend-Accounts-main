import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import ProtectedRoute  from "./components/shared/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// ── Eager (small, always needed) ─────────────────────────────────────────
import LoginPage        from "./features/auth/LoginPage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import PlaceholderPage  from "./pages/PlaceholderPage";

// ── Lazy (code-split — loaded only when navigated to) ────────────────────
const RegisterPage        = lazy(() => import("./features/auth/RegisterPage"));
const DashboardPage       = lazy(() => import("./pages/DashboardPage"));
const OrgTreeTable        = lazy(() => import("./pages/OrgTreeTable"));
const OrganizationChart   = lazy(() => import("./pages/OrganizationChart"));
const PartnerPortalsPage  = lazy(() => import("./pages/PartnerPortalsPage"));
const StaffMembersPage    = lazy(() => import("./pages/StaffMembersPage"));
const RegisterPersonPage  = lazy(() => import("./pages/staff/RegisterPersonPage"));
const PersonProfilePage   = lazy(() => import("./pages/hr/PersonProfilePage"));
const PositionsPage       = lazy(() => import("./pages/PositionsPage"));
const ReportsPage         = lazy(() => import("./pages/ReportsPage"));

// Access — separate pages, each lazy-loaded
const AccessGroupsPage    = lazy(() => import("./pages/access/AccessGroupsPage"));
const DeptMatrixPage      = lazy(() => import("./pages/access/DeptMatrixPage"));
const StaffPermissionsPage = lazy(() => import("./pages/access/StaffPermissionsPage"));
const GroupMatrixPage     = lazy(() => import("./pages/access/GroupMatrixPage"));

// Settings
const MenuManager         = lazy(() => import("./pages/settings/MenuManager"));
const MenuSeeder          = lazy(() => import("./pages/settings/MenuSeeder"));

// ── Suspense fallback ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );
}

function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── Router ────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  { path: "/login",    element: <LoginPage /> },
  { path: "/register", element: <S><RegisterPage /></S> },
  { path: "/403",      element: <AccessDeniedPage /> },

  {
    element: <ProtectedRoute />,
    children: [{
      element: <DashboardLayout />,
      children: [
        { path: "/",          element: <Navigate to="/dashboard" replace /> },
        { path: "/dashboard", element: <S><DashboardPage /></S> },

        // ── Org ──────────────────────────────────────────────────────────
        { path: "/groups/companies", element: <S><OrgTreeTable /></S> },
        { path: "/groups/hierarchy", element: <S><OrganizationChart /></S> },
        { path: "/groups/partners",  element: <S><PartnerPortalsPage /></S> },
        { path: "/groups/staff",     element: <S><StaffMembersPage /></S> },
        { path: "/organization",     element: <S><OrganizationChart /></S> },
        { path: "/organization/new", element: <S><OrganizationChart /></S> },

        // ── HR ───────────────────────────────────────────────────────────
        { path: "/hr/staff",            element: <S><StaffMembersPage /></S> },
        { path: "/hr/staff/register",   element: <S><RegisterPersonPage /></S> },
        { path: "/hr/staff/:id",        element: <S><PersonProfilePage /></S> },
        { path: "/hr/persons",          element: <S><StaffMembersPage /></S> },
        { path: "/hr/persons/register", element: <S><RegisterPersonPage /></S> },
        { path: "/hr/persons/:id",      element: <S><PersonProfilePage /></S> },
        { path: "/hr/vacancies",        element: <S><PositionsPage /></S> },
        { path: "/hr/vacancies/new",    element: <S><PositionsPage /></S> },
        { path: "/hr/positions",        element: <S><PositionsPage /></S> },
        { path: "/hr/reports",          element: <S><ReportsPage /></S> },
        { path: "/positions",           element: <S><PositionsPage /></S> },
        { path: "/positions/new",       element: <S><PositionsPage /></S> },
        { path: "/staff/register",      element: <S><RegisterPersonPage /></S> },

        // ── Access ───────────────────────────────────────────────────────
        { path: "/access",                    element: <Navigate to="/access/groups" replace /> },
        { path: "/access/groups",             element: <S><AccessGroupsPage /></S> },
        { path: "/access/groups/new",         element: <S><AccessGroupsPage /></S> },
        { path: "/access/groups/matrix",      element: <S><GroupMatrixPage /></S> },
        { path: "/access/dept",               element: <S><DeptMatrixPage /></S> },
        { path: "/access/department/:deptId", element: <S><DeptMatrixPage /></S> },
        { path: "/access/matrix/:deptId",     element: <S><DeptMatrixPage /></S> },
        { path: "/access/staff/:staffId",     element: <S><StaffPermissionsPage /></S> },
        { path: "/rbac/staff/:staffId",       element: <S><StaffPermissionsPage /></S> },

        // ── Settings ─────────────────────────────────────────────────────
        { path: "/settings",              element: <Navigate to="/settings/general" replace /> },
        { path: "/settings/menus",        element: <S><MenuManager /></S> },
        { path: "/settings/seed-menus",   element: <S><MenuSeeder /></S> },
        { path: "/menus",                 element: <S><MenuManager /></S> },

        // ── Placeholders ─────────────────────────────────────────────────
        { path: "/finance/revenue",   element: <PlaceholderPage title="Revenue Dashboard" /> },
        { path: "/finance/invoices",  element: <PlaceholderPage title="Invoices & Billing" /> },
        { path: "/analytics/reports", element: <PlaceholderPage title="Custom Reports" /> },
        { path: "/security/roles",    element: <PlaceholderPage title="Roles & Permissions" /> },
      ],
    }],
  },

  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
