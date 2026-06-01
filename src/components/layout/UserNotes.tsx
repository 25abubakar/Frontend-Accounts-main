import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Circle, PencilLine, Sparkles, Clock, Activity } from "lucide-react";
// 🌟 FIX: Added Variants type import
import { motion, AnimatePresence, type Variants } from "framer-motion";
 
interface UserNotesProps {
  isOpen: boolean;
  onClose: () => void;
}
 
type NoteStatus = "doing" | "upcoming" | "done";
 
interface Note {
  id: number;
  text: string;
  status: NoteStatus;
  timestamp: string;
}
 
const UserNotes: React.FC<UserNotesProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<NoteStatus>("doing");
  const [newTask, setNewTask] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
 
  const [notes, setNotes] = useState<Note[]>([
    { id: 1, text: "Review patient Jane Doe's skin test reactions from yesterday.", status: "doing", timestamp: "Today, 09:00 AM" },
    { id: 2, text: "Sign off on the monthly biologicals inventory audit.", status: "doing", timestamp: "Today, 10:15 AM" }
  ]);
 
  const sections: NoteStatus[] = ["doing", "upcoming", "done"];
 
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, [isOpen]);
 
  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const now = new Date();
    const timestamp = "Today, " + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
   
    setNotes([{ id: Date.now(), text: newTask.trim(), status: activeSection, timestamp }, ...notes]);
    setNewTask("");
  };
 
  // 🌟 FIX: Typed as Variants
  const listVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
  };
 
  // 🌟 FIX: Typed as Variants
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 280, damping: 22 } },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
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
     
      <div className={`fixed top-0 h-full w-[400px] sm:w-[460px] z-[70] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] right-0 ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
       
        <div className="h-[calc(100vh-20px)] m-2.5 bg-slate-50/90 backdrop-blur-2xl rounded-[2rem] shadow-[0_20px_80px_-15px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border border-white/60 relative ring-1 ring-slate-900/5">
         
          {/* Header Layout Container */}
          <div className="relative px-6 py-5 shrink-0 z-20 bg-white/50 backdrop-blur-md border-b border-white/60">
            <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-emerald-400 to-transparent" />
 
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-xl border shadow-sm backdrop-blur-lg bg-emerald-50/80 text-emerald-600 border-emerald-200/60">
                   <PencilLine size={20} strokeWidth={2.5} />
                 </div>
                 
                 <div>
                   <h2 className="text-[17px] font-black text-slate-800 tracking-tight leading-none drop-shadow-sm">
                     Personal Notes
                   </h2>
                   <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1.5">
                     <Sparkles size={12} className="text-emerald-500" />
                     Private & Secure
                   </p>
                 </div>
              </div>
 
              <button onClick={onClose} className="p-2 bg-white/50 hover:bg-white text-slate-400 hover:text-slate-800 rounded-xl shadow-sm border border-slate-200/50 transition-all active:scale-90">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
 
            <div className="mt-5 flex relative bg-slate-200/60 p-1 rounded-xl border border-white/60 shadow-inner">
              {sections.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSection(s)}
                  className={`relative flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors duration-300 z-10
                    ${activeSection === s ? "text-emerald-700" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {activeSection === s && (
                    <motion.div
                      layoutId="activeTabIndicatorNotes"
                      className="absolute inset-0 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-white -z-10"
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    />
                  )}
                  <span className="relative z-20">{s}</span>
                </button>
              ))}
            </div>
          </div>
 
          {/* Main Container Content Segment */}
          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar relative z-10">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                 <div className="p-3 rounded-full bg-white shadow-md text-emerald-500">
                    <Activity className="w-6 h-6 animate-pulse" />
                 </div>
                 <span className="text-[11px] font-bold tracking-widest uppercase">Syncing...</span>
               </div>
            ) : (
              <motion.div variants={listVariants} initial="hidden" animate="show" className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {notes.filter(n => n.status === activeSection).map((note) => (
                    <motion.div
                      key={note.id}
                      layout
                      variants={itemVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      whileHover={{ scale: 1.02, y: -3, zIndex: 20, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                      className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-white shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_rgba(0,0,0,0.1)] hover:border-emerald-200 transition-colors duration-300 group origin-center"
                    >
                      <div className="flex items-start gap-3">
                        <Circle size={18} className={`mt-0.5 shrink-0 ${activeSection === 'done' ? 'text-slate-300 fill-slate-100' : 'text-emerald-500 drop-shadow-sm'}`} strokeWidth={2.5} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug break-words whitespace-pre-wrap ${
                            activeSection === 'done' ? 'text-slate-400 line-through font-medium' : 'text-slate-800 font-bold'
                          }`}>
                            {note.text}
                          </p>
                          <div className="mt-2 flex items-center gap-1.5 text-slate-400 font-bold">
                            <Clock size={10} />
                            <span className="text-[9px] uppercase tracking-wider">{note.timestamp}</span>
                          </div>
                        </div>
                        <button onClick={() => setNotes(notes.filter(n => n.id !== note.id))} className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm border border-transparent hover:border-red-100">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
 
          {/* Contextual Action Footer Container */}
          <div className="px-5 py-4 shrink-0 z-20 bg-white/50 backdrop-blur-md border-t border-white/60">
            <div className="flex items-end gap-2 bg-white border p-1.5 rounded-2xl border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all duration-300 shadow-[0_2px_15px_rgba(0,0,0,0.02)] focus-within:bg-white focus-within:shadow-[0_4px_25px_rgba(0,0,0,0.06)] focus-within:-translate-y-0.5">
              <textarea
                placeholder="Type a task..."
                className="w-full bg-transparent text-[13px] font-semibold outline-none px-3 py-2.5 text-slate-800 resize-none min-h-[44px] max-h-[100px] custom-scrollbar placeholder:text-slate-400 placeholder:font-medium leading-snug"
                value={newTask}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTask(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
              />
              <button
                onClick={handleAddTask}
                disabled={!newTask.trim()}
                className={`p-2.5 rounded-xl text-white shadow-sm transition-all duration-300 shrink-0 flex items-center justify-center ${
                  !newTask.trim()
                    ? "bg-slate-200 cursor-not-allowed opacity-50 text-slate-400 shadow-none"
                    : "bg-emerald-600 hover:bg-emerald-500 active:scale-95"
                }`}
              >
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
            <div className="flex justify-between items-center mt-2.5 px-1">
              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                 <kbd className="px-1.5 py-0.5 bg-white rounded text-slate-500 border border-slate-200 shadow-sm">Enter</kbd> to save
              </p>
              <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                 <kbd className="px-1.5 py-0.5 bg-white rounded text-slate-500 border border-slate-200 shadow-sm">Shift+Enter</kbd> for line
              </p>
            </div>
          </div>
        </div>
      </div>
 
      {/* 🌟 FIX: Removed "jsx global" and used dangerouslySetInnerHTML for safe cross-bundler CSS injection */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}} />
    </>
  );
};
 
export default UserNotes;