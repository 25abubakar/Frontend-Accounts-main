import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Globe2, MapPin, Loader2, Plus, Network, Briefcase, UserPlus, Hash, Users, ChevronDown } from "lucide-react";
import type { OrgFlatTreeNode, CreatePositionDto, CreateOrgNodeDto } from "../types";
import { positionApi } from "../api/positionApi";

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentNode: OrgFlatTreeNode | null; 
  treeData?: OrgFlatTreeNode[];
  onSubmitNode: (data: CreateOrgNodeDto) => Promise<void>;
  onSubmitPosition?: (data: CreatePositionDto, count: number) => Promise<void>; 
}

const ORG_TYPES = [
  { id: "Country", label: "Country", icon: Globe2, color: "text-blue-500" },
  { id: "Group", label: "Holding Group", icon: Network, color: "text-purple-500" },
  { id: "Company", label: "Company", icon: Building2, color: "text-emerald-500" },
  { id: "Branch", label: "Branch", icon: MapPin, color: "text-orange-500" },
  { id: "Department", label: "Department", icon: Briefcase, color: "text-indigo-500" },
  { id: "Team", label: "Team", icon: Users, color: "text-pink-500" }, 
];

// 🌟 Smart Code Auto-Generator
const generateCode = (name: string) => {
  if (!name) return "";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
};

// 🌟 Custom Interactive Searchable Dropdown
const SearchableDropdown = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);

  // Keep local search synced with parent value
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value); // Allow completely custom typing
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        placeholder={placeholder}
        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 py-2.5 pl-4 pr-10 text-sm font-semibold text-[#0B1B3D] transition-all focus:border-[#00A3FF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00A3FF]/10"
      />
      
      {/* Clear Button */}
      {search && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            onChange("");
            setIsOpen(true); // Keep open to show full list after clearing
          }}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} strokeWidth={3} />
        </button>
      )}

      {/* Dropdown Arrow */}
      <ChevronDown
        size={16}
        className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />

      {/* Floating Options Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl custom-scrollbar"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <li
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input onBlur from firing before click
                    setSearch(opt.label);
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-[#00A3FF]/10 hover:text-[#00A3FF]"
                >
                  {opt.label}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm font-semibold text-slate-400 italic">
                Press enter to use "{search}"
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};


export default function AddNodeModal({ isOpen, onClose, parentNode, treeData = [], onSubmitNode, onSubmitPosition }: AddNodeModalProps) {
  const [mode, setMode] = useState<"Structure" | "Position">("Structure");
  
  // Org Node State
  // 🌟 FIXED: Starts completely empty now instead of defaulting to "Company"
  const [selectedType, setSelectedType] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  // Position State
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [vacancyCount, setVacancyCount] = useState<number>(1); 
  const [previewCode, setPreviewCode] = useState(""); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate Available Departments dynamically based on the current parent node
  const availableDepartments = useMemo(() => {
    if (!parentNode) return ["General"];
    
    if (parentNode.label === "Department") {
      return [parentNode.name];
    }
    
    const childDepartments = treeData
      .filter(n => n.parentId === parentNode.id && n.label === "Department")
      .map(n => n.name);

    return [parentNode.name, ...childDepartments];
  }, [parentNode, treeData]);

  useEffect(() => {
    if (isOpen) {
      setName(""); 
      setCode(""); 
      setJobTitle(""); 
      setPreviewCode("");
      setVacancyCount(1);
      setError(null);
      setMode(!parentNode ? "Structure" : "Structure");
      
      // 🌟 FIXED: Keep the Entity Type dropdown totally empty on modal open
      setSelectedType("");

      if (availableDepartments.length > 0) {
        setDepartment(availableDepartments[0]);
      }
    }
  }, [isOpen, parentNode, availableDepartments]);

  useEffect(() => {
    if (mode === "Position" && parentNode && jobTitle.trim()) {
      const fetchPreview = async () => {
        try {
          const data = await positionApi.previewCode(parentNode.id, jobTitle.trim());
          setPreviewCode(data.vacancyCode);
        } catch (err) {
          setPreviewCode("Error generating code");
        }
      };
      
      const timeoutId = setTimeout(fetchPreview, 500); 
      return () => clearTimeout(timeoutId);
    } else {
      setPreviewCode("");
    }
  }, [jobTitle, mode, parentNode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);

      if (mode === "Structure") {
        if (!name.trim()) throw new Error("Entity Name is required.");
        if (!selectedType.trim()) throw new Error("Entity Type is required.");
        
        await onSubmitNode({
          name: name.trim(),
          code: code.trim() || null,
          label: selectedType.trim(),
          parentId: parentNode ? parentNode.id : null
        });
      } else {
        if (!parentNode) throw new Error("Positions must be attached to an existing entity.");
        if (!jobTitle.trim()) throw new Error("Job Title is required.");
        if (!onSubmitPosition) throw new Error("Backend connection missing!");
        if (vacancyCount < 1) throw new Error("Number of vacancies must be at least 1.");

        await onSubmitPosition({
          organizationId: parentNode.id,
          jobTitle: jobTitle.trim(),
          department: department.trim()
        }, vacancyCount); 
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchingType = ORG_TYPES.find(t => t.id.toLowerCase() === selectedType.toLowerCase());
  const SelectedIcon = mode === "Position" ? UserPlus : (matchingType?.icon || Briefcase);
  const iconColor = mode === "Position" ? "text-[#00A3FF]" : (matchingType?.color || "text-slate-500");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />

          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 overflow-visible">
            
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100 shadow-inner">
                  <SelectedIcon className={iconColor} size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-[#0B1B3D]">
                    {mode === "Structure" ? "Add Entity" : "Create Open Position"}
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {parentNode ? `Adding to ${parentNode.name}` : "Creating root entity"}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
            </div>

            {error && <div className="mb-6 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-5 overflow-visible">
              
              {parentNode && (
                <div className="flex rounded-xl bg-slate-100 p-1 shadow-inner ring-1 ring-slate-200/50 mb-6">
                  <button type="button" onClick={() => setMode("Structure")} className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${mode === "Structure" ? "bg-white text-[#0B1B3D] shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}>
                    Org Structure
                  </button>
                  <button type="button" onClick={() => setMode("Position")} className={`flex-1 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${mode === "Position" ? "bg-white text-[#00A3FF] shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"}`}>
                    Open Position
                  </button>
                </div>
              )}

              {/* --- STRUCTURE FORM FIELDS --- */}
              {mode === "Structure" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Entity Type <span className="text-red-500">*</span></label>
                    <SearchableDropdown 
                      value={selectedType}
                      onChange={setSelectedType}
                      placeholder="Type or select entity type..."
                      options={ORG_TYPES.map(t => ({ label: t.label, value: t.id }))}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Entity Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setName(val);
                        setCode(generateCode(val));
                      }} 
                      placeholder="e.g. TechSoft" 
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:border-[#00A3FF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00A3FF]/10" 
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">System Code (Optional)</label>
                    <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. US, PK" maxLength={10} className="w-full uppercase rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:border-[#00A3FF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00A3FF]/10" />
                  </div>
                </>
              )}

              {/* --- POSITION FORM FIELDS --- */}
              {mode === "Position" && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Job Title <span className="text-red-500">*</span></label>
                    <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Developer" className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold focus:border-[#00A3FF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00A3FF]/10" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 overflow-visible z-50">
                    <div className="relative">
                      <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Department</label>
                      <SearchableDropdown 
                        value={department}
                        onChange={setDepartment}
                        placeholder="Select department..."
                        options={availableDepartments.map(d => ({ label: d, value: d }))}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase text-slate-500">
                        <Hash size={12} /> Vacancies Count
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="100"
                        value={vacancyCount} 
                        onChange={(e) => setVacancyCount(parseInt(e.target.value) || 1)} 
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-[#00A3FF] focus:border-[#00A3FF] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#00A3FF]/10" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-400">Position Code Preview</label>
                    <div className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-mono font-bold text-[#00A3FF] flex items-center overflow-hidden whitespace-nowrap">
                      {!jobTitle.trim() ? (
                        <span className="text-slate-400 font-sans text-xs">Waiting for title...</span>
                      ) : !previewCode ? (
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      ) : (
                        previewCode
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="mt-8 flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 rounded-xl bg-[#0B1B3D] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#00A3FF] disabled:opacity-50 transition-colors">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Save {mode}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}