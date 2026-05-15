import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe2, Building2, MapPin, Briefcase, 
  Loader2, Network, Plus, Minus
} from "lucide-react";
import { orgTreeApi } from "../api/orgTreeApi";
import { positionApi } from "../api/positionApi"; 
import type { OrgFlatTreeNode, VacancyDto } from "../types"; 

// 🌟 Smart Flag Dictionary for missing or 3-letter codes
const COUNTRY_MAP: Record<string, string> = {
  "united states": "us", "usa": "us", "america": "us", "canada": "ca", "mexico": "mx",
  "united kingdom": "gb", "uk": "gb", "great britain": "gb", "england": "gb", "scotland": "gb",
  "germany": "de", "france": "fr", "italy": "it", "spain": "es", "netherlands": "nl", 
  "switzerland": "ch", "belgium": "be", "sweden": "se", "norway": "no", "denmark": "dk", 
  "finland": "fi", "ireland": "ie", "portugal": "pt", "greece": "gr", "russia": "ru", "ukraine": "ua",
  "saudi arabia": "sa", "ksa": "sa", "uae": "ae", "united arab emirates": "ae", "dubai": "ae", 
  "qatar": "qa", "kuwait": "kw", "oman": "om", "bahrain": "bh", "egypt": "eg", "turkey": "tr",
  "israel": "il", "iran": "ir", "iraq": "iq", "jordan": "jo", "lebanon": "lb",
  "pakistan": "pk", "india": "in", "china": "cn", "japan": "jp", "south korea": "kr", "korea": "kr",
  "indonesia": "id", "malaysia": "my", "singapore": "sg", "philippines": "ph", "thailand": "th", 
  "vietnam": "vn", "bangladesh": "bd", "sri lanka": "lk", "nepal": "np", "afghanistan": "af",
  "south africa": "za", "nigeria": "ng", "kenya": "ke", "ghana": "gh", "morocco": "ma", "algeria": "dz",
  "australia": "au", "aus": "au", "new zealand": "nz",
  "brazil": "br", "argentina": "ar", "colombia": "co", "chile": "cl", "peru": "pe"
};

interface OrgTreeNode extends OrgFlatTreeNode {
  children: OrgTreeNode[];
}

const buildTree = (flatData: OrgFlatTreeNode[]): OrgTreeNode[] => {
  const nodeMap = new Map<number, OrgTreeNode>();
  const rootNodes: OrgTreeNode[] = [];

  flatData.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  flatData.forEach((node) => {
    const currentNode = nodeMap.get(node.id);
    if (currentNode) {
      if (node.parentId === null) {
        rootNodes.push(currentNode);
      } else {
        const parentNode = nodeMap.get(node.parentId);
        if (parentNode) {
          parentNode.children.push(currentNode);
        }
      }
    }
  });

  return rootNodes;
};

// --- RESPONSIVE POSITION CARD ---
const PositionCard = ({ position }: { position: VacancyDto }) => {
  const isFilled = position.isFilled;
  const displayName = isFilled && position.employee ? position.employee.fullName : "Vacant Position";
  const displayRole = position.jobTitle;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.15, type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center"
    >
      <div className="relative flex items-center group">
        <motion.div 
          layout
          className={`relative z-10 flex w-[240px] sm:w-[280px] items-center gap-2.5 sm:gap-3 rounded-2xl border p-2.5 sm:p-3 shadow-md transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg ${
            isFilled 
              ? "bg-white border-emerald-200 hover:border-emerald-300" 
              : "bg-amber-50/40 border-amber-200 border-dashed hover:border-amber-400 hover:bg-amber-50/80"
          }`}
        >
          <div className="relative h-9 w-9 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-sm flex items-center justify-center bg-white border border-slate-100">
            {isFilled ? (
              <span className="font-black text-emerald-600 text-sm sm:text-base">{displayName.charAt(0)}</span>
            ) : (
              <Briefcase size={16} className="text-amber-400 sm:w-[18px] sm:h-[18px]" />
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <h3 className={`truncate text-[13px] sm:text-[14px] font-bold tracking-tight ${isFilled ? 'text-slate-800' : 'text-amber-700 italic'}`} title={displayName}>
                {displayName}
              </h3>
              <span className={`shrink-0 flex h-2 w-2 rounded-full ${isFilled ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`}></span>
            </div>
            
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`shrink-0 rounded-md px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${
                isFilled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-100/50 text-amber-700 border border-amber-200'
              }`}>
                {displayRole}
              </span>
              <span className="truncate text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase border border-slate-100 bg-slate-50 px-1.5 py-0.5 rounded-md">
                ID: {position.vacancyCode}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// --- RESPONSIVE RECURSIVE HORIZONTAL NODE ---
const TreeNode = ({ node, allPositions }: { node: OrgTreeNode, allPositions: VacancyDto[] }) => {
  const nodePositions = allPositions.filter(p => p.organizationId === node.id);
  
  const combinedChildren = [
    ...nodePositions.map(pos => ({ type: 'position' as const, data: pos })),
    ...node.children.map(child => ({ type: 'node' as const, data: child }))
  ];

  const hasItems = combinedChildren.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);

  const getIcon = (label: string, displayName: string) => {
    switch (label) {
      case "Country": 
        let iso = node.code?.trim().toLowerCase();
        if (iso === "uk") iso = "gb";
        if (!iso || iso.length !== 2) iso = COUNTRY_MAP[displayName.toLowerCase().trim()];

        if (iso) {
          return (
            <img 
              src={`https://flagcdn.com/w40/${iso}.png`} 
              alt={displayName}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-gradient-to-br', 'from-blue-300', 'to-blue-500', 'flex', 'items-center', 'justify-center');
              }}
            />
          );
        }
        return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-300 to-blue-500 text-white"><Globe2 size={16} className="sm:w-[18px] sm:h-[18px]" /></div>;
      case "Company": 
        return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-300 to-teal-500 text-white"><Building2 size={16} className="sm:w-[18px] sm:h-[18px]" /></div>;
      case "Branch": 
        return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-300 to-rose-400 text-white"><MapPin size={16} className="sm:w-[18px] sm:h-[18px]" /></div>;
      case "Staff": 
        return (
          <img 
            src={`https://i.pravatar.cc/44?u=${node.id}`} 
            alt={displayName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        );
      default: 
        return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-300 to-slate-500 text-white"><Briefcase size={16} className="sm:w-[18px] sm:h-[18px]" /></div>;
    }
  };

  const getBadgeStyle = (label: string) => {
    switch (label) {
      case "Country": return "bg-blue-50 text-blue-600 border border-blue-100";
      case "Company": return "bg-emerald-50 text-emerald-600 border border-emerald-100";
      case "Branch": return "bg-orange-50 text-orange-600 border border-orange-100";
      case "Staff": return "bg-violet-50 text-violet-600 border border-violet-100";
      default: return "bg-slate-50 text-slate-600 border border-slate-100";
    }
  };

  const displayName = node.name.split(' - ')[0];
  const displayRole = node.name.includes(' - ') ? node.name.split(' - ')[1] : null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.15, type: "spring", stiffness: 400, damping: 30 }}
      className="flex items-center"
    >
      {/* 1. THE NODE CARD */}
      <div className="relative flex items-center group">
        <motion.div 
          layout
          onClick={() => hasItems && setIsExpanded(!isExpanded)}
          className={`relative z-10 flex w-[240px] sm:w-[280px] items-center gap-2.5 sm:gap-3 rounded-2xl border bg-white p-2.5 sm:p-3 shadow-md transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg hover:bg-slate-50 ${
            hasItems ? "cursor-pointer border-slate-200 hover:border-blue-300" : "border-slate-100"
          }`}
        >
          <div className={`relative h-9 w-9 sm:h-11 sm:w-11 shrink-0 ${node.label === 'Staff' ? 'overflow-hidden rounded-full ring-2 ring-violet-100' : ''}`}>
            {node.label !== 'Staff' && (
                <div className="absolute inset-0 rounded-xl bg-current opacity-10 blur-sm transition-opacity group-hover:opacity-20"></div>
            )}
            <div className={`relative h-full w-full overflow-hidden ${node.label === 'Staff' ? '' : 'rounded-xl shadow-inner border border-black/5'}`}>
              {getIcon(node.label, displayName)}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[13px] sm:text-[14px] font-bold tracking-tight text-slate-800" title={displayName}>
                {displayName}
              </h3>
              {node.code && (
                <span className="shrink-0 rounded-md bg-slate-50 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 border border-slate-100">
                  {node.code}
                </span>
              )}
            </div>
            
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`shrink-0 rounded-md px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ${getBadgeStyle(node.label)}`}>
                {node.label}
              </span>
              {displayRole && (
                <span className="truncate text-[10px] sm:text-[11px] font-medium text-slate-400" title={displayRole}>
                  {displayRole}
                </span>
              )}
            </div>
          </div>

          {hasItems && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`absolute -right-3.5 top-1/2 z-20 flex h-6 w-6 sm:h-7 sm:w-7 -translate-y-1/2 items-center justify-center rounded-full border shadow-sm transition-colors duration-100 ${
                isExpanded 
                  ? "border-sky-200 bg-sky-50 text-sky-600 hover:bg-sky-100" 
                  : "border-slate-200 bg-white text-slate-400 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50"
              }`}
            >
              <motion.div 
                initial={false}
                animate={{ rotate: isExpanded ? 180 : 0, scale: isExpanded ? 0.9 : 1.1 }} 
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {isExpanded ? <Minus size={14} strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Plus size={14} strokeWidth={2.5} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </motion.div>
            </button>
          )}
        </motion.div>

        {/* 🌟 RESPONSIVE OUTBOUND LINE using scaleX instead of fixed width */}
        <AnimatePresence>
          {isExpanded && hasItems && (
            <motion.div 
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute -right-6 sm:-right-8 top-1/2 z-0 h-[2px] w-6 sm:w-8 origin-left -translate-y-1/2 bg-sky-400"
            />
          )}
        </AnimatePresence>
      </div>

      {/* 2. THE CHILDREN RECURSION */}
      <AnimatePresence>
        {isExpanded && hasItems && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5, filter: "blur(2px)" }}
            transition={{ duration: 0.15 }}
            className="ml-6 sm:ml-8 flex flex-col justify-center"
          >
            {combinedChildren.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === combinedChildren.length - 1;
              const isOnly = combinedChildren.length === 1;
              const itemKey = item.type === 'position' ? `pos-${item.data.vacancyId}` : `node-${item.data.id}`;

              return (
                <div key={itemKey} className="relative flex items-center py-2 sm:py-2.5 pl-6 sm:pl-8">
                  {/* 🌟 RESPONSIVE INCOMING LINE */}
                  <motion.div 
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.15 }}
                    className="absolute left-0 top-1/2 z-0 h-[2px] w-6 sm:w-8 origin-left -translate-y-1/2 bg-sky-400"
                  />
                  
                  {/* The Vertical Trunk Lines */}
                  {!isOnly && (
                    <>
                      {!isFirst && <div className="absolute left-0 top-0 z-0 h-1/2 w-[2px] bg-sky-300" />}
                      {!isLast && <div className="absolute left-0 top-1/2 z-0 h-1/2 w-[2px] bg-sky-300" />}
                    </>
                  )}

                  {item.type === 'position' ? (
                    <PositionCard position={item.data as VacancyDto} />
                  ) : (
                    <TreeNode node={item.data as OrgTreeNode} allPositions={allPositions} />
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- 4. MAIN PAGE COMPONENT ---
export default function OrganizationChart() {
  const [treeData, setTreeData] = useState<OrgTreeNode[]>([]);
  const [positions, setPositions] = useState<VacancyDto[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndBuildTree = async () => {
      try {
        setIsLoading(true);
        const [flatData, posData] = await Promise.all([
          orgTreeApi.getFlatTree(),
          positionApi.getAll()
        ]);

        const structuralNodes = flatData.filter(node => node.label !== "Staff");
        const nestedTree = buildTree(structuralNodes);

        const mappedOldStaff: VacancyDto[] = flatData
          .filter(node => node.label === "Staff")
          .map(staff => {
            const path = staff.treePath?.split(" → ") || [];
            return {
              vacancyId: staff.id.toString(),
              organizationId: staff.parentId || 0,
              branchName: path[2] || "—",
              companyName: path[1] || "—",
              countryName: path[0] || "—",
              nodeLabel: "Staff",
              vacancyCode: staff.code || "LEGACY",
              jobTitle: staff.name.split(" - ")[1] || "Staff",
              department: "General",
              isFilled: true,
              createdDate: new Date().toISOString(),
              employee: {
                staffId: staff.id.toString(),
                fullName: staff.name.split(" - ")[0],
                email: "legacy@company.com",
                phone: "—",
                vacancyId: staff.id.toString(),
                vacancyCode: staff.code || "LEGACY",
                jobTitle: staff.name.split(" - ")[1] || "Staff",
                joiningDate: new Date().toISOString()
              }
            };
          });

        const allCombinedPositions = [...mappedOldStaff, ...posData];

        setTreeData(nestedTree);
        setPositions(allCombinedPositions); 
        setError(null);
      } catch (err) {
        console.error("Failed to load chart data:", err);
        setError("Unable to connect to the server.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndBuildTree();
  }, []);

  return (
    <div className="h-screen w-full bg-slate-100 p-2 sm:p-4 font-sans text-slate-900 selection:bg-sky-500/10 relative overflow-hidden flex flex-col">
      
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-sky-200/20 blur-[100px] z-0"></div>
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-emerald-200/10 blur-[100px] z-0"></div>

      <div className="flex h-full w-full flex-col relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 shrink-0 rounded-2xl bg-white/80 p-4 sm:p-5 backdrop-blur-md border border-slate-200/60 shadow-md flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Network size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-slate-800 leading-tight">
                Organization Network
              </h1>
              <p className="text-[11px] sm:text-sm font-medium text-slate-500">
                Interactive global entity mapping
              </p>
            </div>
          </div>
        </motion.div>

        {/* Interactive Canvas */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative flex-1 w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 shadow-md backdrop-blur-xl"
        >
          
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-30 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]"></div>

          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-50">
              <div className="rounded-2xl bg-white p-6 sm:p-8 text-center shadow-lg border border-red-100 max-w-md mx-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Network size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">{error}</h2>
                <p className="mt-2 text-sm text-slate-500">Ensure your backend is running and CORS is properly configured.</p>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full overflow-auto p-4 sm:p-8 custom-scrollbar touch-pan-x touch-pan-y">
              {!isLoading && treeData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-bold text-slate-700">Empty Network</h3>
                    <p className="mt-1 text-sm font-medium">Your global directory currently has no nodes.</p>
                  </div>
                </div>
              ) : (
                <div className="w-max min-w-full min-h-full pb-32 pr-32 pt-2 sm:pt-4 pl-2 sm:pl-4 flex flex-col gap-6 sm:gap-8">
                  {treeData.map((rootNode) => (
                    <div key={rootNode.id} className="relative">
                      <TreeNode node={rootNode} allPositions={positions} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}