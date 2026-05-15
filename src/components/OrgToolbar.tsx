import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, List, Globe2, ChevronRight, ArrowBigLeft, Plus,
  Filter, X, ChevronDown
} from "lucide-react";
import type { OrgFlatTreeNode, VacancyDto } from "../types";
import { getIcon } from "../utils/orgGroupTreeDesign";

export interface TableFilters {
  country: string;
  company: string;
  branch: string;
  jobTitle: string;
  status: "all" | "active" | "vacant";
}

interface OrgToolbarProps {
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
  breadcrumbs: OrgFlatTreeNode[];
  setBreadcrumbs: (crumbs: OrgFlatTreeNode[]) => void;
  currentParent: OrgFlatTreeNode | null;
  onAddClick: () => void;
  // 🌟 ADDED treeData so we can see empty countries!
  treeData: OrgFlatTreeNode[];
  allData: VacancyDto[];
  filters: TableFilters;
  onFilterChange: (filters: TableFilters) => void;
}

const SelectFilter = ({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) => (
  <div className={`relative flex items-center transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-bold text-slate-700 shadow-sm transition-all focus:border-[#00A3FF] focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/15 hover:border-slate-300"
    >
      <option value="">{label}</option>
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-slate-400" />
  </div>
);

export default function OrgToolbar({
  viewMode, setViewMode, breadcrumbs, setBreadcrumbs, currentParent, onAddClick,
  treeData, allData, filters, onFilterChange,
}: OrgToolbarProps) {

  const getAddButtonText = () => {
    if (!currentParent) return "Country";
    switch (currentParent.label) {
      case "Country": return "Group / Company";
      case "Group": return "Company";
      case "Company": return "Branch";
      case "Branch": return "Staff";
      default: return "Entity";
    }
  };

  // ── Helper to trace if an empty node belongs to a selected parent ──
  const hasAncestorName = (node: OrgFlatTreeNode, ancestorName: string): boolean => {
    let current: OrgFlatTreeNode | undefined = node;
    while (current) {
      if (current.name === ancestorName) return true;
      current = treeData.find(n => n.id === current?.parentId);
    }
    return false;
  };

  // ── Derive unique filter options from BOTH live data AND structural tree ──
  const unique = (arr: (string | null | undefined)[]) =>
    Array.from(new Set(arr.filter((v): v is string => !!v && v !== "—"))).sort();

  // 1. Countries (Pulls every empty country + filled countries)
  const countryOptions = unique([
    ...treeData.filter(n => n.label === "Country").map(n => n.name),
    ...allData.map(d => d.countryName)
  ]);

  // 2. Companies (Cascades perfectly based on country selection)
  const companyOptions = unique([
    ...treeData
        .filter(n => n.label === "Company" || n.label === "Group")
        .filter(n => !filters.country || hasAncestorName(n, filters.country))
        .map(n => n.name),
    ...allData
        .filter(d => !filters.country || d.countryName === filters.country)
        .map(d => d.companyName)
  ]);

  // 3. Branches (Cascades based on country and company)
  const branchOptions = unique([
    ...treeData
        .filter(n => n.label === "Branch")
        .filter(n => !filters.country || hasAncestorName(n, filters.country))
        .filter(n => !filters.company || hasAncestorName(n, filters.company))
        .map(n => n.name),
    ...allData
        .filter(d => !filters.country || d.countryName === filters.country)
        .filter(d => !filters.company || d.companyName === filters.company)
        .map(d => d.branchName)
  ]);

  // 4. Job Titles (Only exist in allData, empty nodes don't have jobs yet)
  const jobTitleOptions = unique(
    allData
      .filter(d => !filters.country || d.countryName === filters.country)
      .filter(d => !filters.company || d.companyName === filters.company)
      .filter(d => !filters.branch || d.branchName === filters.branch)
      .map(d => d.jobTitle)
  );

  const hasActiveFilters =
    filters.country || filters.company || filters.branch ||
    filters.jobTitle || filters.status !== "all";

  const clearAll = () =>
    onFilterChange({ country: "", company: "", branch: "", jobTitle: "", status: "all" });

  const setCountry = (v: string) =>
    onFilterChange({ country: v, company: "", branch: "", jobTitle: "", status: filters.status });
  const setCompany = (v: string) =>
    onFilterChange({ ...filters, company: v, branch: "", jobTitle: "" });
  const setBranch = (v: string) =>
    onFilterChange({ ...filters, branch: v, jobTitle: "" });
  const setJobTitle = (v: string) =>
    onFilterChange({ ...filters, jobTitle: v });
  const setStatus = (v: string) =>
    onFilterChange({ ...filters, status: v as TableFilters["status"] });

  return (
    <>
      {/* ── Header row ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#0B1B3D] to-slate-500">
              Master Directory
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
              Organizational Structure
            </p>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center rounded-xl bg-white p-1 border border-slate-200 shadow-sm">
            {(["grid", "table"] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-colors z-10 ${
                  viewMode === mode ? "text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {viewMode === mode && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#00A3FF] to-blue-500 shadow-md -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {mode === "grid" ? <LayoutGrid size={16} /> : <List size={16} />}
                <span className="capitalize">{mode} Mode</span>
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb trail */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold">
          <button
            onClick={() => setBreadcrumbs([])}
            className={`flex items-center gap-1.5 transition-all hover:-translate-y-0.5 ${
              breadcrumbs.length === 0
                ? "text-[#00A3FF] bg-blue-50 px-3 py-1 rounded-md"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe2 size={16} /> Global
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <ChevronRight size={14} className="text-slate-300" />
              <button
                onClick={() => setBreadcrumbs(breadcrumbs.slice(0, index + 1))}
                className={`flex items-center gap-1.5 transition-all hover:-translate-y-0.5 ${
                  index === breadcrumbs.length - 1
                    ? "text-[#00A3FF] bg-blue-50 px-3 py-1 rounded-md"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {getIcon(crumb.label, "w-4 h-4")}
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Action bar (back + add) ─────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-200/50 shadow-sm">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setBreadcrumbs(breadcrumbs.slice(0, -1))}
          disabled={breadcrumbs.length === 0}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ArrowBigLeft size={18} /> Go Back
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(0,163,255,0.4)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddClick}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#00A3FF] to-blue-500 px-6 py-2.5 text-sm font-black text-white shadow-md transition-all"
        >
          <Plus size={18} strokeWidth={3} />
          Add {getAddButtonText()}
        </motion.button>
      </div>

      {/* ── Filter bar — only in table mode ────────────────────────────── */}
      {viewMode === "table" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        >
          {/* Icon label */}
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 mr-1">
            <Filter size={13} /> Filters
          </div>

          {/* Country */}
          <SelectFilter
            label="All Countries"
            value={filters.country}
            options={countryOptions}
            onChange={setCountry}
          />

          {/* Company — cascades from country */}
          <SelectFilter
            label="All Companies"
            value={filters.company}
            options={companyOptions}
            onChange={setCompany}
            disabled={companyOptions.length === 0}
          />

          {/* Branch — cascades from company */}
          <SelectFilter
            label="All Branches"
            value={filters.branch}
            options={branchOptions}
            onChange={setBranch}
            disabled={branchOptions.length === 0}
          />

          {/* Job Title / Role — cascades from branch */}
          <SelectFilter
            label="All Roles"
            value={filters.jobTitle}
            options={jobTitleOptions}
            onChange={setJobTitle}
            disabled={jobTitleOptions.length === 0}
          />

          {/* Status */}
          <div className="relative flex items-center">
            <select
              value={filters.status}
              onChange={e => setStatus(e.target.value)}
              className="h-9 appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-bold text-slate-700 shadow-sm transition-all focus:border-[#00A3FF] focus:outline-none focus:ring-2 focus:ring-[#00A3FF]/15 hover:border-slate-300"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="vacant">Vacant Only</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-slate-400" />
          </div>

          {/* Active filter chips */}
          <div className="flex flex-wrap items-center gap-1.5 ml-1">
            {filters.country && (
              <span className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-1 text-[10px] font-bold text-blue-600">
                {filters.country}
                <button onClick={() => setCountry("")} className="hover:text-blue-800"><X size={10} /></button>
              </span>
            )}
            {filters.company && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                {filters.company}
                <button onClick={() => setCompany("")} className="hover:text-emerald-800"><X size={10} /></button>
              </span>
            )}
            {filters.branch && (
              <span className="flex items-center gap-1 rounded-full bg-orange-50 border border-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                {filters.branch}
                <button onClick={() => setBranch("")} className="hover:text-orange-800"><X size={10} /></button>
              </span>
            )}
            {filters.jobTitle && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
                {filters.jobTitle}
                <button onClick={() => setJobTitle("")} className="hover:text-indigo-800"><X size={10} /></button>
              </span>
            )}
            {filters.status !== "all" && (
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                filters.status === "active"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                  : "bg-amber-50 border-amber-100 text-amber-600"
              }`}>
                {filters.status === "active" ? "Active" : "Vacant"}
                <button onClick={() => setStatus("all")} className="hover:opacity-70"><X size={10} /></button>
              </span>
            )}
          </div>

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </motion.div>
      )}
    </>
  );
}