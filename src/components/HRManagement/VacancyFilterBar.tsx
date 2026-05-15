import { Filter, X, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const SelectFilter = ({ label, value, options, onChange, disabled }: any) => (
  <div className={`relative flex items-center transition-opacity ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="h-9 appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-bold text-slate-700 shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 hover:border-slate-300"
    >
      <option value="">{label}</option>
      {options?.map((o: string) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-slate-400" />
  </div>
);

export default function VacancyFilterBar({ filters, setFilters, options, hasActiveFilters }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 mr-1">
        <Filter size={13} /> Filters
      </div>

      <SelectFilter 
        label="All Countries" 
        value={filters.country} 
        options={options.countryOptions} 
        onChange={(v: string) => setFilters((f: any) => ({ ...f, country: v, group: "", company: "", branch: "", department: "", jobTitle: "" }))} 
      />

      <SelectFilter 
        label="All Groups" 
        value={filters.group} 
        options={options.groupOptions} 
        onChange={(v: string) => setFilters((f: any) => ({ ...f, group: v, company: "", branch: "", department: "", jobTitle: "" }))} 
        disabled={!options.groupOptions || options.groupOptions.length === 0} 
      />
      
      <SelectFilter 
        label="All Companies" 
        value={filters.company} 
        options={options.companyOptions} 
        onChange={(v: string) => setFilters((f: any) => ({ ...f, company: v, branch: "", department: "", jobTitle: "" }))} 
        disabled={!options.companyOptions || options.companyOptions.length === 0} 
      />
      
      <SelectFilter 
        label="All Branches" 
        value={filters.branch} 
        options={options.branchOptions} 
        onChange={(v: string) => setFilters((f: any) => ({ ...f, branch: v, department: "", jobTitle: "" }))} 
        disabled={!options.branchOptions || options.branchOptions.length === 0} 
      />

      <SelectFilter 
        label="All Departments" 
        value={filters.department} 
        options={options.departmentOptions} 
        onChange={(v: string) => setFilters((f: any) => ({ ...f, department: v, jobTitle: "" }))} 
        disabled={!options.departmentOptions || options.departmentOptions.length === 0} 
      />
      
      <SelectFilter 
        label="All Roles" 
        value={filters.jobTitle} 
        options={options.roleOptions} 
        onChange={(v: string) => setFilters((f: any) => ({ ...f, jobTitle: v }))} 
        disabled={!options.roleOptions || options.roleOptions.length === 0} 
      />

      {hasActiveFilters && (
        <button 
          onClick={() => setFilters({ country: "", group: "", company: "", branch: "", department: "", jobTitle: "" })} 
          className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X size={12} /> Clear all
        </button>
      )}
    </motion.div>
  );
}