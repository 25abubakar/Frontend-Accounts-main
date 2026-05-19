/**
 * src/components/access/index.ts
 *
 * Central export point for all access management components.
 * Import from here in page files.
 */

// Helpers & types
export * from "./accessHelpers";

// Group management components
export { default as GroupModal } from "./GroupModal";
export { default as GroupPanel } from "./GroupPanel";
export { default as GroupTable } from "./GroupTable";
export { default as DeleteGroupModal } from "./DeleteGroupModal";
export { default as SyncInfoBanner } from "./SyncInfoBanner";

// Matrix components
export { default as MatrixToolbar } from "./MatrixToolbar";
export { default as MatrixTable } from "./MatrixTable";
export { default as RoleGroupRow } from "./RoleGroupRow";
