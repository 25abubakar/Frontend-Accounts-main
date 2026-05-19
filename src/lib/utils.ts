/**
 * src/lib/utils.ts
 * Shared utility functions used across the entire project.
 * Import from here instead of duplicating in each file.
 */

// ── Array normalizer ──────────────────────────────────────────────────────
/**
 * Safely converts any API response to a typed array.
 * Handles: plain arrays, { $values: [] }, { data: [] }, { items: [] }, { staff: [] }
 */
export function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items", "staff"]) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

// ── Avatar gradient ───────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "from-indigo-400 to-violet-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

/** Returns a deterministic Tailwind gradient class based on a name string */
export function avatarGrad(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Role badge colours ────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  agent:        "bg-gray-100 text-gray-700",
  supervisor:   "bg-blue-100 text-blue-700",
  manager:      "bg-green-100 text-green-700",
  asstmanager:  "bg-yellow-100 text-yellow-700",
  ceo:          "bg-purple-100 text-purple-700",
  dutyceo:      "bg-indigo-100 text-indigo-700",
  "bell boy":   "bg-orange-100 text-orange-700",
  bellboy:      "bg-orange-100 text-orange-700",
};

/** Returns a Tailwind bg+text class for a job title / role name */
export function roleBadge(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  return ROLE_COLORS[key] ?? ROLE_COLORS[name.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

// ── Group features by module ──────────────────────────────────────────────
export interface FeatureLike {
  featureKey: string;
  featureName: string;
  module: string;
}

/** Groups an array of features by their module field */
export function groupByModule<T extends FeatureLike>(features: T[]): Record<string, T[]> {
  return toArr<T>(features).reduce<Record<string, T[]>>((acc, f) => {
    const m = f.module || "General";
    (acc[m] ??= []).push(f);
    return acc;
  }, {});
}

// ── Shared form CSS classes ───────────────────────────────────────────────
/** Standard input field class */
export const INPUT_CLS =
  "w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";

/** Standard label class */
export const LABEL_CLS = "text-xs font-bold uppercase text-slate-500 mb-1.5 block";

// ── Menu tree → FeatureDto[] ──────────────────────────────────────────────
/**
 * Flattens a sidebar menu tree into FeatureDto[] with module = "Menu".
 * Used by DeptMatrixPage, AccessGroupsPage, GroupMatrixPage.
 * Import from here — do NOT duplicate in each page file.
 */
export interface ApiMenuItemLike {
  id: number;
  title: string;
  children?: ApiMenuItemLike[];
}

export function flattenMenuToFeatures(
  items: ApiMenuItemLike[],
  prefix = ""
): FeatureLike[] {
  const result: FeatureLike[] = [];
  for (const item of items) {
    const key  = `MENU_${item.id}`;
    const name = prefix ? `${prefix} › ${item.title}` : item.title;
    result.push({ featureKey: key, featureName: name, module: "Menu" });
    if (item.children?.length) {
      result.push(...flattenMenuToFeatures(item.children, item.title));
    }
  }
  return result;
}

// ── Date formatter ────────────────────────────────────────────────────────
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Error message extractor ───────────────────────────────────────────────
/** Extracts a human-readable message from an axios error response */
export function extractErrorMessage(e: unknown, fallback = "An error occurred."): string {
  const err = e as {
    response?: {
      data?: {
        message?: string;
        Message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
    };
  };
  const d = err.response?.data;
  if (!d) return fallback;
  return (
    d.message ??
    d.Message ??
    (d.errors ? Object.values(d.errors).flat().join(" ") : null) ??
    d.title ??
    fallback
  );
}
