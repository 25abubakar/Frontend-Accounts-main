// src/types/index.ts

// ─────────────────────────────────────────────────────────
// ORGANIZATION TREE
// ─────────────────────────────────────────────────────────

export interface OrgNode {
  id: number;
  name: string;
  code: string | null;
  label: "Country" | "Group" | "Company" | "Branch" | "Staff" | string;
  parentId: number | null;
  parentName?: string;
  flagUrl?: string | null;
}

export interface OrgFlatTreeNode extends OrgNode {
  level: number;
  treePath: string;
  treeStructure: string;
}

export interface CreateOrgNodeDto {
  name: string;
  code?: string | null;
  label: string;
  parentId?: number | null;
  flagUrl?: string | null;
}

export interface UpdateOrgNodeDto {
  name: string;
  code?: string | null;
  label: string;
  parentId?: number | null;
  flagUrl?: string | null;
}

// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  userName: string;
  roles: string[];
}

// POST /api/Auth/register
export interface RegisterDto {
  userName: string; // 🌟 Changed from email to userName
  password: string;
  confirmPassword: string;
  role: string;
}

// POST /api/Auth/login
export interface LoginDto {
  userName: string; // 🌟 Changed from email to userName
  password: string;
  rememberMe: boolean;
}

// Login/Register response — backend uses cookies, no token field
export interface AuthResponse {
  success: boolean;
  message: string;
  userName?: string; // 🌟 Added userName to match the updated C# backend
  email?: string;    // Kept for backward compatibility
  roles: string[];
}

// kept for backward compat — alias
export type LoginResponse = AuthResponse;

// POST /api/Auth/assign-role
export interface AssignRoleDto {
  userName: string; // 🌟 Changed from email to userName
  role: string;
}

// ─────────────────────────────────────────────────────────
// LOCATION (Cascading Dropdowns)
// ─────────────────────────────────────────────────────────

export interface CountryDto {
  name: string;
  code: string;
  flagUrl: string;
}

export interface ProvinceDto {
  name: string;
  stateCode: string;
}

// ─────────────────────────────────────────────────────────
// POSITIONS / VACANCIES
// ─────────────────────────────────────────────────────────

export interface CreatePositionDto {
  organizationId: number;
  jobTitle: string;
  department?: string;
}

export interface UpdateVacancyDto {
  jobTitle: string;
  department?: string;
  organizationId: number;
}

export interface VacancyDto {
  vacancyId: string;
  organizationId: number;
  branchName: string;
  companyName: string;
  countryName: string;
  nodeLabel: string;
  vacancyCode: string;
  jobTitle: string;
  department: string;
  isFilled: boolean;
  createdDate: string;
  employee?: StaffDto | null;
}

// ─────────────────────────────────────────────────────────
// STAFF
// ─────────────────────────────────────────────────────────

export interface StaffDto {
  staffId: string;
  fullName: string;
  email: string;
  phone: string;
  photoUrl?: string | null;
  vacancyId: string;
  vacancyCode: string;
  jobTitle: string;
  department?: string;
  branchName?: string;
  companyName?: string;
  countryName?: string;
  joiningDate: string;
  loginId?: string | null;     
}

export interface UpdateStaffDto {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface TransferStaffDto {
  newVacancyId: string;
}