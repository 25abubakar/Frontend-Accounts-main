import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

// Layouts & Protection
import ProtectedRoute from "./components/shared/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Auth Pages
import LoginPage from "./features/auth/LoginPage";
import RegisterPage from "./features/auth/RegisterPage";

// Core Pages
import DashboardPage from "./pages/DashboardPage";
import OrgTreeTable from "./pages/OrgTreeTable";
import OrganizationChart from "./pages/OrganizationChart";
import StaffMembersPage from "./pages/StaffMembersPage";
import PartnerPortalsPage from "./pages/PartnerPortalsPage";
import PositionsPage from "./pages/PositionsPage";
import ReportsPage from "./pages/ReportsPage";

// Staff / HR Pages
import RegisterPersonPage from "./pages/staff/RegisterPersonPage";
import PersonProfilePage from "./pages/hr/PersonProfilePage";

// Access Pages
import DeptMatrixPage from "./pages/access/DeptMatrixPage";
import AccessGroupsPage from "./pages/access/AccessGroupsPage";

// Settings Pages
import GeneralPreferences from "./pages/settings/GeneralPreferences";
import BrandingTheming from "./pages/settings/BrandingTheming";
import EmailTemplates from "./pages/settings/EmailTemplates";
import IntegrationSetup from "./pages/settings/IntegrationSetup";
import MenuManager from "./pages/settings/MenuManager";
import MenuSeeder from "./pages/settings/MenuSeeder";

// Placeholder for unbuilt pages
import PlaceholderPage from "./pages/PlaceholderPage";

const router = createBrowserRouter([
  { path: "/login",    element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/",         element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },

          // ── Accounts & Groups (legacy paths kept) ──────────────────────
          { path: "/groups/companies",  element: <OrgTreeTable /> },
          { path: "/groups/hierarchy",  element: <OrganizationChart /> },
          { path: "/groups/staff",      element: <StaffMembersPage /> },
          { path: "/groups/partners",   element: <PartnerPortalsPage /> },

          // ── HR Management ──────────────────────────────────────────────
          // canonical HR paths (from spec)
          { path: "/hr/staff",              element: <StaffMembersPage /> },
          { path: "/hr/staff/register",     element: <RegisterPersonPage /> },
          { path: "/hr/staff/:id",          element: <PersonProfilePage /> },
          { path: "/hr/vacancies",          element: <PositionsPage /> },
          { path: "/hr/vacancies/new",      element: <PositionsPage /> },
          { path: "/hr/positions",          element: <PositionsPage /> },
          { path: "/hr/reports",            element: <ReportsPage /> },

          // legacy staff register path
          { path: "/staff/register",        element: <RegisterPersonPage /> },

          // ── Organization ───────────────────────────────────────────────
          { path: "/organization",          element: <OrganizationChart /> },
          { path: "/organization/new",      element: <OrganizationChart /> },

          // ── Access Management ──────────────────────────────────────────
          { path: "/access",                        element: <Navigate to="/access/groups" replace /> },
          { path: "/access/groups",                 element: <AccessGroupsPage /> },
          { path: "/access/groups/new",             element: <AccessGroupsPage /> },
          { path: "/access/department/:deptId",     element: <DeptMatrixPage /> },

          // ── Financial Operations ───────────────────────────────────────
          { path: "/finance/revenue",   element: <PlaceholderPage title="Revenue Dashboard" /> },
          { path: "/finance/invoices",  element: <PlaceholderPage title="Invoices & Billing" /> },
          { path: "/finance/expenses",  element: <PlaceholderPage title="Expense Tracking" /> },
          { path: "/finance/tax",       element: <PlaceholderPage title="Tax Documentation" /> },
          { path: "/finance/audits",    element: <PlaceholderPage title="Audit Logs" /> },

          // ── System Analytics ───────────────────────────────────────────
          { path: "/analytics/traffic",    element: <PlaceholderPage title="Live Traffic" /> },
          { path: "/analytics/engagement", element: <PlaceholderPage title="User Engagement" /> },
          { path: "/analytics/reports",    element: <PlaceholderPage title="Custom Reports" /> },
          { path: "/analytics/export",     element: <PlaceholderPage title="Data Exports" /> },

          // ── Security & Access (legacy) ─────────────────────────────────
          { path: "/security/roles",        element: <PlaceholderPage title="Roles & Permissions" /> },
          { path: "/security/auth-logs",    element: <PlaceholderPage title="Authentication Logs" /> },
          { path: "/security/api-keys",     element: <PlaceholderPage title="API Key Management" /> },
          { path: "/security/ip-whitelist", element: <PlaceholderPage title="IP Whitelisting" /> },

          // ── Platform Settings ──────────────────────────────────────────
          { path: "/settings/general",      element: <GeneralPreferences /> },
          { path: "/settings/branding",     element: <BrandingTheming /> },
          { path: "/settings/emails",       element: <EmailTemplates /> },
          { path: "/settings/integrations", element: <IntegrationSetup /> },
          { path: "/settings/menus",        element: <MenuManager /> },
          { path: "/settings/seed-menus",   element: <MenuSeeder /> },
          { path: "/settings",              element: <Navigate to="/settings/general" replace /> },
        ],
      },
    ],
  },

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
