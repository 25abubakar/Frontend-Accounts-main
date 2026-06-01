import React, { useState, useEffect, useRef } from "react";
import { 
  Type, FileText, AlertCircle, Eye, Save, X, Loader2, Search, 
  ChevronDown, Check, Globe, Building2, GitBranch 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// API Imports
import { staffApi } from "../../api/staffApi";
import { orgTreeApi } from "../../api/orgTreeApi"; 
import type { StaffDto, OrgNode } from "../../types";

export interface InstructionFormData {
  title: string;
  description: string;
  priority: string;
  visibility: string;
  branchId?: string; // Capturing the lowest selected level
}

interface InstructionFormProps {
  onSave: (data: InstructionFormData) => void;
  onCancel: () => void;
}

const InstructionForm: React.FC<InstructionFormProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<string>("Standard");
  
  // ── Org Tree States (Cascading) ──
  const [countries, setCountries] = useState<OrgNode[]>([]);
  const [companies, setCompanies] = useState<OrgNode[]>([]);
  const [branches, setBranches] = useState<OrgNode[]>([]);
  const [isLoadingOrg, setIsLoadingOrg] = useState<boolean>(true);

  const [selCountry, setSelCountry] = useState<string>("");
  const [selCompany, setSelCompany] = useState<string>("");
  const [selBranch, setSelBranch] = useState<string>("");

  // ── Searchable Target Visibility States ──
  const [visibility, setVisibility] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Staff API States ──
  const [staffList, setStaffList] = useState<StaffDto[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(false);

  // Load Organization Tree on Mount
  useEffect(() => {
    setIsLoadingOrg(true);
    Promise.all([
      orgTreeApi.getByLabel("Country").catch(() => []),
      orgTreeApi.getByLabel("Company").catch(() => []),
      orgTreeApi.getByLabel("Branch").catch(() => [])
    ]).then(([co, cm, br]) => {
      setCountries(co);
      setCompanies(cm);
      setBranches(br);
    }).finally(() => {
      setIsLoadingOrg(false);
    });
  }, []);

  // Fetch all staff once a branch is selected
  useEffect(() => {
    if (!selBranch) {
      setStaffList([]);
      return;
    }
    const fetchStaffForBranch = async () => {
      setIsLoadingStaff(true);
      try {
        const data = await staffApi.getAll();
        
        // Ensure it's an array
        const staffArray = Array.isArray(data) ? data : (data as any).items || (data as any).data || [];
        setStaffList(staffArray);
      } catch (error) {
        console.error("Failed to fetch staff:", error);
      } finally {
        setIsLoadingStaff(false);
      }
    };
    fetchStaffForBranch();
  }, [selBranch]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      visibility: getSelectedName(),
      branchId: selBranch // Passing branch ID
    });
  };

  const getSelectedName = () => {
    if (visibility === "all") return "All Users / Global";
    const selectedStaff = staffList.find(
      (s) => String((s as any).staffId) === String(visibility) || String((s as any).id) === String(visibility)
    );
    return selectedStaff 
      ? ((selectedStaff as any).fullName || (selectedStaff as any).name || "Unknown User") 
      : "Unknown User";
  };

  // ── Cascading Logic & Resetting ──
  const handleCountryChange = (val: string) => {
    setSelCountry(val);
    setSelCompany(""); setSelBranch(""); setVisibility("all");
  };
  const handleCompanyChange = (val: string) => {
    setSelCompany(val);
    setSelBranch(""); setVisibility("all");
  };
  const handleBranchChange = (val: string) => {
    setSelBranch(val);
    setVisibility("all");
  };

  // Filter Dropdowns based on parent
  const filteredCompanies = companies.filter(c => !selCountry || (c as any).parentId === Number(selCountry));
  const filteredBranches = branches.filter(b => !selCompany || (b as any).parentId === Number(selCompany));

  // ── Staff Filtering (Fixed to handle missing Branch IDs gracefully) ──
  const filteredStaff = staffList.filter((user) => {
    const userName = String((user as any).fullName || (user as any).name || (user as any).firstName || "").toLowerCase();
    const matchesSearch = userName.includes(searchQuery.toLowerCase());
    
    // Check if the backend actually provided a branchId on the user object
    const hasBranchData = "branchId" in user || "orgId" in user;
    
    // If the backend has branch data, filter by it. If it doesn't, just rely on the search!
    const matchesBranch = !hasBranchData || 
      (user as any).branchId === Number(selBranch) || 
      String((user as any).branchId) === selBranch ||
      (user as any).orgId === Number(selBranch);
                        
    return matchesSearch && matchesBranch;
  }).slice(0, 3); // STRICT LIMIT: Only show 2 to 3 staff members

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          New Guideline Form
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Title Input */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Type size={12} className="text-blue-500" /> Title / Protocol Type
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Emergency Protocol, System Update"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold outline-none transition-all focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>

        {/* ── Cascading Org Dropdowns ── */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100 relative">
          {isLoadingOrg && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-xl">
              <Loader2 size={20} className="animate-spin text-blue-500" />
            </div>
          )}

          {/* Country */}
          <div className="relative">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Globe size={10} /> Country
            </label>
            <select
              value={selCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none appearance-none focus:border-blue-400 text-slate-700"
            >
              <option value="">Select Country...</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 bottom-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Company */}
          <div className="relative">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 size={10} /> Company
            </label>
            <select
              value={selCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              disabled={!selCountry}
              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none appearance-none focus:border-blue-400 text-slate-700 disabled:opacity-50"
            >
              <option value="">Select Company...</option>
              {filteredCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 bottom-2 text-slate-400 pointer-events-none" />
          </div>

          {/* Branch */}
          <div className="relative">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <GitBranch size={10} /> Branch
            </label>
            <select
              value={selBranch}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={!selCompany}
              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold outline-none appearance-none focus:border-blue-400 text-slate-700 disabled:opacity-50"
            >
              <option value="">Select Branch...</option>
              {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 bottom-2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* ── Limited Searchable Target Visibility Dropdown ── */}
        <div ref={dropdownRef} className="relative z-50">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Eye size={12} className="text-blue-500" /> Target Visibility (Staff)
          </label>
          
          <button
            type="button"
            disabled={!selBranch}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] font-semibold flex items-center justify-between transition-all focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 ${
              !selBranch ? "opacity-50 cursor-not-allowed text-slate-400" : "text-slate-700"
            }`}
          >
            <span className="truncate pr-2">
              {!selBranch ? "Select a branch first..." : getSelectedName()}
            </span>
            {isLoadingStaff ? (
              <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />
            ) : (
              <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            )}
          </button>

          <AnimatePresence>
            {isDropdownOpen && selBranch && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col z-50"
              >
                {/* Search Input */}
                <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <Search size={14} className="text-slate-400 ml-1 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Type to search staff..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-[13px] font-semibold text-slate-700 outline-none placeholder:text-slate-400 placeholder:font-medium"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Options List (Limited to 3) */}
                <div className="overflow-y-auto custom-scrollbar p-1.5">
                  
                  {("All Users / Global".toLowerCase().includes(searchQuery.toLowerCase())) && (
                    <div
                      onClick={() => { setVisibility("all"); setIsDropdownOpen(false); setSearchQuery(""); }}
                      className={`w-full px-3 py-2 text-[13px] rounded-lg cursor-pointer flex items-center justify-between mb-1 transition-colors ${
                        visibility === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-600 font-medium hover:bg-slate-100"
                      }`}
                    >
                      <span>All Users / Global</span>
                      {visibility === "all" && <Check size={14} strokeWidth={3} />}
                    </div>
                  )}

                  {filteredStaff.map((user) => {
                    const userId = (user as any).staffId || (user as any).id;
                    const userName = (user as any).fullName || (user as any).name || "Unknown User";
                    const isSelected = visibility === String(userId);
                    
                    return (
                      <div
                        key={userId}
                        onClick={() => { setVisibility(String(userId)); setIsDropdownOpen(false); setSearchQuery(""); }}
                        className={`w-full px-3 py-2 text-[13px] rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-600 font-medium hover:bg-slate-100"
                        }`}
                      >
                        <span className="truncate pr-2">{userName}</span>
                        {isSelected && <Check size={14} strokeWidth={3} className="shrink-0" />}
                      </div>
                    );
                  })}

                  {filteredStaff.length === 0 && searchQuery && (
                    <div className="py-4 text-center">
                      <p className="text-[11px] font-semibold text-slate-400">No staff found matching "{searchQuery}"</p>
                    </div>
                  )}
                  {/* Footer hint if there are more than 3 total items that match branch */}
                  {staffList.length > 3 && (
                    <div className="text-center pt-1 pb-1 border-t border-slate-100 mt-1">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type to see more results</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Description & Priority */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText size={12} className="text-blue-500" /> Instruction Details
          </label>
          <textarea
            required
            rows={3}
            placeholder="Provide clear, concise steps or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-semibold outline-none resize-none transition-all focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <AlertCircle size={12} className="text-blue-500" /> Priority Level
          </label>
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
            {["Standard", "High", "Critical"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  priority === p
                    ? p === "Critical" ? "bg-red-500 text-white shadow-sm"
                      : p === "High" ? "bg-amber-500 text-white shadow-sm"
                      : "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-600 text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !description.trim()}
            className={`flex-1 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 ${
              (!title.trim() || !description.trim())
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-blue-600 hover:bg-blue-500 active:scale-[0.98]"
            }`}
          >
            <Save size={14} /> Save Instruction
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default InstructionForm;