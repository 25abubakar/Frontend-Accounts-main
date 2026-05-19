/**
 * src/lib/featureKeys.ts
 *
 * Canonical feature key constants — these MUST match exactly what the
 * backend seeds into the Features table via /api/access/features.
 *
 * Rule: Never use raw string literals like "PERSON_REGISTER" in JSX.
 * Always import from here so a single rename fixes everything.
 *
 * Backend endpoint to verify: GET /api/access/features
 * Each entry: { featureKey, featureName, module }
 */

// ── HR Management ─────────────────────────────────────────────────────────
export const FEATURE = {
  // Persons
  PERSON_VIEW:       "PERSON_VIEW",
  PERSON_REGISTER:   "PERSON_REGISTER",
  PERSON_EDIT:       "PERSON_EDIT",
  PERSON_DELETE:     "PERSON_DELETE",

  // Staff / Employees
  EMPLOYEE_VIEW:     "EMPLOYEE_VIEW",
  EMPLOYEE_HIRE:     "EMPLOYEE_HIRE",
  EMPLOYEE_FIRE:     "EMPLOYEE_FIRE",
  EMPLOYEE_TRANSFER: "EMPLOYEE_TRANSFER",
  EMPLOYEE_EDIT:     "EMPLOYEE_EDIT",

  // Vacancies / Positions
  VACANCY_VIEW:      "VACANCY_VIEW",
  VACANCY_CREATE:    "VACANCY_CREATE",
  VACANCY_EDIT:      "VACANCY_EDIT",
  VACANCY_DELETE:    "VACANCY_DELETE",

  // Organization
  ORG_VIEW:          "ORG_VIEW",
  ORG_CREATE:        "ORG_CREATE",
  ORG_EDIT:          "ORG_EDIT",
  ORG_DELETE:        "ORG_DELETE",

  // Access / Permissions
  ACCESS_VIEW:       "ACCESS_VIEW",
  ACCESS_MANAGE:     "ACCESS_MANAGE",

  // Reports
  REPORT_VIEW:       "REPORT_VIEW",
  REPORT_EXPORT:     "REPORT_EXPORT",

  // Settings / Menus
  SETTINGS_VIEW:     "SETTINGS_VIEW",
  MENU_MANAGE:       "MENU_MANAGE",
} as const;

export type FeatureKey = typeof FEATURE[keyof typeof FEATURE];
