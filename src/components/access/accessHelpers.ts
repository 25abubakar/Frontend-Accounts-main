/**
 * src/components/access/accessHelpers.ts
 *
 * Shared types, pure helpers, and style constants for all access components.
 * Import from here — never duplicate in page files.
 */

import type { FeatureDto, MatrixStaffRow } from "../../api/accessApi";

// ── Types ─────────────────────────────────────────────────────────────────

export type PermMap = Record<string, Record<string, boolean>>;

export interface RoleGroup {
  jobTitle: string;
  rows: MatrixStaffRow[];
}

// ── Array normalizer ──────────────────────────────────────────────────────

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

const GRADS = [
  "from-indigo-400 to-violet-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500",
];

export function grad(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return GRADS[Math.abs(h) % GRADS.length];
}

// ── Role badge colours ────────────────────────────────────────────────────

const ROLE_CLR: Record<string, string> = {
  agent:        "bg-gray-100 text-gray-700",
  supervisor:   "bg-blue-100 text-blue-700",
  manager:      "bg-green-100 text-green-700",
  asstmanager:  "bg-yellow-100 text-yellow-700",
  ceo:          "bg-purple-100 text-purple-700",
  dutyceo:      "bg-indigo-100 text-indigo-700",
  bellboy:      "bg-orange-100 text-orange-700",
  "bell boy":   "bg-orange-100 text-orange-700",
};

export function roleBadge(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "");
  return ROLE_CLR[key] ?? ROLE_CLR[name.toLowerCase()] ?? "bg-slate-100 text-slate-600";
}

// ── Group features by module ──────────────────────────────────────────────

export function byModule(fs: FeatureDto[]): Record<string, FeatureDto[]> {
  return toArr<FeatureDto>(fs).reduce<Record<string, FeatureDto[]>>((a, f) => {
    const m = f.module || "General";
    (a[m] ??= []).push(f);
    return a;
  }, {});
}

export function groupByModule(features: FeatureDto[]): Record<string, FeatureDto[]> {
  return features.reduce<Record<string, FeatureDto[]>>((acc, f) => {
    const mod = f.module || "General";
    (acc[mod] ??= []).push(f);
    return acc;
  }, {});
}

// ── Matrix helpers ────────────────────────────────────────────────────────

export function rowKey(r: MatrixStaffRow): string {
  return r.staffId ?? r.personId;
}

export function groupByRole(staff: MatrixStaffRow[]): RoleGroup[] {
  const map = new Map<string, MatrixStaffRow[]>();
  for (const r of staff) {
    const title = r.jobTitle ?? "Unassigned";
    if (!map.has(title)) map.set(title, []);
    map.get(title)!.push(r);
  }
  return Array.from(map.entries()).map(([jobTitle, rows]) => ({ jobTitle, rows }));
}

export function roleMajority(rows: MatrixStaffRow[], featureKey: string): boolean {
  const hired = rows.filter(r => r.staffId);
  if (hired.length === 0) return false;
  const trueCount = hired.filter(r => {
    const p = r.permissions.find(p => p.featureKey === featureKey);
    return p?.hasAccess ?? false;
  }).length;
  return trueCount > hired.length / 2;
}

export function buildPermMap(staff: MatrixStaffRow[]): PermMap {
  const map: PermMap = {};
  for (const r of staff) {
    const key = rowKey(r);
    map[key] = {};
    for (const p of r.permissions ?? []) {
      map[key][p.featureKey] = p.hasAccess;
    }
  }
  return map;
}

// ── Shared CSS constants ──────────────────────────────────────────────────

export const INP =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";

export const LBL =
  "text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block";
