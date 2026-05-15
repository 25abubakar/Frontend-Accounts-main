import {
  LayoutDashboard,
  Users,
  Settings,
  Briefcase,
  LineChart,
  Shield,
  BarChart3,
} from "lucide-react";

export type MenuItem = {
  name: string;
  path?: string;
  icon: React.ElementType;
  children?: { name: string; path: string }[];
};

export const navItems: MenuItem[] = [
  {
    name: "Overview",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Accounts & Groups",
    icon: Users,
    children: [
      { name: "Master Directory",      path: "/groups/companies" },
      { name: "Graphical Hierarchy",   path: "/groups/hierarchy" },
      { name: "Partner Portals",       path: "/groups/partners" },
    ],
  },
  {
    name: "HR Management",
    icon: Briefcase,
    children: [
      { name: "Staff & Persons",   path: "/groups/staff" },
      { name: "Vacancy Overview",  path: "/groups/registration" },
      { name: "Register Person",   path: "/staff/register" },
      { name: "Positions",         path: "/hr/positions" },
      { name: "Reports",           path: "/hr/reports" },
    ],
  },
  {
    name: "Financial Operations",
    icon: LineChart,
    children: [
      { name: "Revenue Dashboard",  path: "/finance/revenue" },
      { name: "Invoices & Billing", path: "/finance/invoices" },
      { name: "Expense Tracking",   path: "/finance/expenses" },
      { name: "Tax Documentation",  path: "/finance/tax" },
      { name: "Audit Logs",         path: "/finance/audits" },
    ],
  },
  {
    name: "System Analytics",
    icon: BarChart3,
    children: [
      { name: "Live Traffic",     path: "/analytics/traffic" },
      { name: "User Engagement",  path: "/analytics/engagement" },
      { name: "Custom Reports",   path: "/analytics/reports" },
      { name: "Data Exports",     path: "/analytics/export" },
    ],
  },
  {
    name: "Security & Access",
    icon: Shield,
    children: [
      { name: "Roles & Permissions",   path: "/security/roles" },
      { name: "Authentication Logs",   path: "/security/auth-logs" },
      { name: "API Key Management",    path: "/security/api-keys" },
      { name: "IP Whitelisting",       path: "/security/ip-whitelist" },
    ],
  },
  {
    name: "Platform Settings",
    icon: Settings,
    children: [
      { name: "General Preferences", path: "/settings/general" },
      { name: "Branding & Theming",  path: "/settings/branding" },
      { name: "Email Templates",     path: "/settings/emails" },
      { name: "Integration Setup",   path: "/settings/integrations" },
    ],
  },
];
