import { motion } from "framer-motion";
import { Edit2, Trash2, ChevronRight } from "lucide-react";
import type { OrgFlatTreeNode } from "../types";
import { getIcon, getFlag, getCardStyle, getHoverShadow, itemVariants } from "../utils/orgGroupTreeDesign";

interface OrgGridCardProps {
  node: OrgFlatTreeNode;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function OrgGridCard({ node, onClick, onEdit, onDelete }: OrgGridCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ 
        y: -8, 
        scale: 1.02,
        boxShadow: getHoverShadow(node.label),
        zIndex: 10
      }}
      onClick={onClick}
      className={`group relative flex flex-col items-start rounded-[1.5rem] p-6 text-left ring-1 shadow-sm transition-all duration-300 cursor-pointer overflow-hidden ${getCardStyle(node.label)}`}
    >
      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="rounded-full bg-white/80 p-2 text-slate-500 backdrop-blur-sm transition-all hover:bg-white hover:text-[#00A3FF] hover:shadow-md hover:scale-110"
          title="Edit"
        >
          <Edit2 size={16} strokeWidth={2.5} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="rounded-full bg-white/80 p-2 text-slate-500 backdrop-blur-sm transition-all hover:bg-white hover:text-red-500 hover:shadow-md hover:scale-110"
          title="Delete"
        >
          <Trash2 size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mb-6 relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5 text-3xl overflow-hidden z-10 transition-transform duration-500 group-hover:scale-110">
        {/* 🌟 FIXED: Passed node.name as the second argument so the Smart Dictionary works! */}
        {node.label === "Country" ? getFlag(node.code, node.name) : getIcon(node.label, "w-8 h-8 text-[#00A3FF]")}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 pointer-events-none"></div>
      </div>
      
      <h3 className="text-[17px] font-black tracking-tight text-slate-800 pr-12 z-10 line-clamp-1">{node.name}</h3>
      <p className="mt-1.5 text-xs font-bold uppercase tracking-widest text-slate-500/80 z-10">
        {node.code ? `CODE: ${node.code}` : node.label}
      </p>
   
      <div className="absolute -bottom-8 -right-8 opacity-5 text-slate-900 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none transform group-hover:rotate-12 group-hover:scale-110">
         {getIcon(node.label, "w-32 h-32")}
      </div>

      <div className="absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-300 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:text-[#00A3FF] shadow-lg z-20">
        <ChevronRight size={20} strokeWidth={3} />
      </div>
    </motion.div>
  );
}