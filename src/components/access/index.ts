/**
 * src/components/access/index.ts
 *
 * Central export point for access management components.
 * Import from here in page files.
 */

// Helpers & types
export * from "./accessHelpers";

// Matrix components (kept for legacy compatibility)
export { default as MatrixToolbar } from "./MatrixToolbar";
export { default as MatrixTable } from "./MatrixTable";
export { default as RoleGroupRow } from "./RoleGroupRow";
