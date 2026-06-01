import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Plus, Bell, Calendar, Activity, Lock, ChevronLeft, Inbox, Sparkles } from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import InstructionForm, { type InstructionFormData } from "./InstructionForm";
 
interface GlobalNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}
 
interface Instruction {
  id: number;
  type: string;
  priority: string;
  text: string;
  date: string;
  visibility: string;
  screen: string;
}
 
const GlobalNotesDrawer: React.FC<GlobalNotesDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const currentScreen = location.pathname;
 
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddingInstruction, setIsAddingInstruction] = useState<boolean>(false);
 
  const [instructions, setInstructions] = useState<Instruction[]>([
    {
      id: 1,
      type: "Clinical Protocol",
      priority: "Critical",
      text: "Ensure all anaphylaxis response kits in Examination Rooms 1-4 are checked, sealed, and verified before the morning shift begins.",
      date: "Today, 08:00 AM",
      visibility: "All Users",
      screen: "/dashboard"
    },
    {
      id: 2,
      type: "Category Update",
      priority: "Standard",
      text: "Please double check taxonomy mapping codes when creating new custom medication classes.",
      date: "Yesterday, 14:30 PM",
      visibility: "All Users",
      screen: "/category"
    }
  ]);
 
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setIsAddingInstruction(false);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [isOpen, currentScreen]);
 
  const handleSaveNewInstruction = (formData: InstructionFormData) => {
    const now = new Date();
    const timestamp = "Today, " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
   
    const newEntry: Instruction = {
      id: Date.now(),
      type: formData.title,
      priority: formData.priority,
      text: formData.description,
      date: timestamp,
      visibility: formData.visibility,
      screen: currentScreen
    };
 
    setInstructions([newEntry, ...instructions]);
    setIsAddingInstruction(false);
  };
 
  // 🌟 FIX: Explicitly type the filtered array and the item inside the filter
  const filteredInstructions: Instruction[] = instructions.filter(
    (item: Instruction) => item.screen === currentScreen
  );
 
  const listVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  };
 
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 22 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
  };
 
  // 🌟 FIX: Extracted the complex conditional logic into a clean, typed helper function
  const renderDrawerContent = () => {
    if (isAddingInstruction) {
      return (
        <InstructionForm
          key="form"
          onSave={handleSaveNewInstruction}
          onCancel={() => setIsAddingInstruction(false)}
        />
      );
    }
 
    if (filteredInstructions.length === 0) {
      return (
        <motion.div
          key="empty" // 🌟 FIX: Added required AnimatePresence key
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center justify-center h-[250px] text-slate-400 text-center px-6"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm mb-3">
            <Inbox size={20} />
          </div>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">No specific items yet</p>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Instructions added here will only appear when viewing the current page path.
          </p>
        </motion.div>
      );
    }
 
    return (
      <motion.div key="list" variants={listVariants} initial="hidden" animate="show" className="space-y-3">
        {/* 🌟 FIX: Explicitly typed 'item' inside the map */}
        {filteredInstructions.map((item: Instruction) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            whileHover={{ scale: 1.03, y: -4, zIndex: 20, transition: { type: "spring", stiffness: 300, damping: 20 } }}
            className="bg-white/90 backdrop-blur-sm p-4.5 rounded-[1.25rem] border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.12)] transition-shadow duration-300 relative overflow-hidden group origin-center"
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 opacity-80 group-hover:opacity-100 transition-opacity ${
              item.priority === 'Critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' :
              item.priority === 'High' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' :
              'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
            }`} />
            <div className="flex justify-between items-center mb-3 pl-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${
                item.priority === 'Critical' ? 'bg-red-50 text-red-600 border-red-100' :
                item.priority === 'High' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                'bg-blue-50 text-blue-600 border-blue-100'
              }`}>
                {item.type}
              </span>
              <div className="flex items-center gap-1.5 text-slate-500 font-bold bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/50">
                <Calendar size={12} />
                <span className="text-[9px] uppercase tracking-wider">{item.date}</span>
              </div>
            </div>
            <p className="text-[13px] font-semibold text-slate-700 leading-snug pl-2 break-words">
              {item.text}
            </p>
           
            {item.visibility && item.visibility !== "All Users / Global" && (
              <div className="mt-3 ml-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <Lock size={10} />
                <span>Visible to: {item.visibility}</span>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>
    );
  };
 
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-900/20 z-[60]"
            onClick={onClose}
          />
        )}
      </AnimatePresence>
     
      <div className={`fixed top-0 h-full w-[400px] sm:w-[460px] z-[70] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] left-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
       
        <div className="h-[calc(100vh-20px)] m-2.5 bg-slate-50/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-white/60 relative ring-1 ring-slate-900/5">
         
          {/* Header */}
          <div className="relative px-6 py-5 shrink-0 z-20 bg-white/50 backdrop-blur-md border-b border-white/60">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-blue-400 to-transparent" />
 
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-xl border shadow-sm backdrop-blur-lg bg-blue-50/80 text-blue-600 border-blue-200/60">
                   <Bell size={20} strokeWidth={2.5} />
                 </div>
                 
                 <div>
                   <h2 className="text-[17px] font-black text-slate-800 tracking-tight leading-none drop-shadow-sm">
                     {isAddingInstruction ? "Create Guideline" : `Instructions: ${currentScreen.replace('/', '').toUpperCase() || 'DASHBOARD'}`}
                   </h2>
                   <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                     <Sparkles size={12} className="text-blue-500" />
                     {isAddingInstruction ? "New Entry Mode" : "Screen-Specific Guidelines"}
                   </p>
                 </div>
              </div>
 
              <button onClick={onClose} className="p-2 bg-white/50 hover:bg-white text-slate-400 hover:text-slate-800 rounded-xl shadow-sm border border-slate-200/50 transition-all active:scale-90">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
 
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar relative z-10">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                 <div className="p-3 rounded-full bg-white shadow-md text-blue-500">
                    <Activity className="w-6 h-6 animate-pulse" />
                 </div>
                 <span className="text-[11px] font-bold tracking-widest uppercase">Syncing...</span>
               </div>
            ) : (
              <AnimatePresence mode="wait">
                {/* 🌟 Calling the helper function we created above */}
                {renderDrawerContent()}
              </AnimatePresence>
            )}
          </div>
 
          {/* Footer Actions */}
          <div className="px-5 py-4 shrink-0 z-20 bg-white/50 backdrop-blur-md border-t border-white/60">
            {!isAddingInstruction ? (
              <button
                onClick={() => setIsAddingInstruction(true)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 border border-blue-700/30"
              >
                <Plus size={16} strokeWidth={3} />
                Add Instruction
              </button>
            ) : (
              <button
                onClick={() => setIsAddingInstruction(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 text-xs font-black uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
                Back to Instructions
              </button>
            )}
          </div>
        </div>
      </div>
 
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}} />
    </>
  );
};
 
export default GlobalNotesDrawer;