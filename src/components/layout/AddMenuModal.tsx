import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, LayoutGrid, Type, Image as ImageIcon, Link, Layers, Shield } from 'lucide-react';
import { menuApi, type ApiMenuItem, type CreateMenuDto } from '../../api/menuApi';

interface AddMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ApiMenuItem | null;
}

// 🌟 Polished: Tighter padding, slightly smaller text for a crisp, professional SaaS look
const INPUT_CLASS = "w-full rounded-xl border border-slate-200/80 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-medium focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/15 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]";
const LABEL_CLASS = "flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1";

export default function AddMenuModal({ isOpen, onClose, onSuccess, initialData }: AddMenuModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parentOptions, setParentOptions] = useState<{id: number, title: string}[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [route, setRoute] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [roles, setRoles] = useState(""); 

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || "");
        setIcon(initialData.icon || "");
        setRoute(initialData.route || "");
        setParentId(initialData.parentId?.toString() || "");
        setSortOrder(initialData.sortOrder || 0);
        setRoles(initialData.roles ? initialData.roles.join(', ') : ""); 
      } else {
        setTitle(""); setIcon(""); setRoute(""); setParentId(""); setSortOrder(0); setRoles("");
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (isOpen) {
      menuApi.getSidebarTree().then(data => {
        const flatList: {id: number, title: string}[] = [];
        const extract = (items: ApiMenuItem[], prefix = "") => {
          items.forEach(item => {
            if (item.id !== initialData?.id) {
              flatList.push({ id: item.id, title: prefix + item.title });
              if (item.children && item.children.length > 0) {
                extract(item.children, prefix + "— ");
              }
            }
          });
        };
        if (Array.isArray(data)) extract(data);
        setParentOptions(flatList);
      }).catch(err => console.error("Could not load parent menus", err));
    }
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Menu Title is strictly required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: CreateMenuDto = {
        title: title.trim(),
        icon: icon.trim() || null,
        route: route.trim() || null,
        parentId: parentId ? parseInt(parentId) : null, 
        sortOrder: sortOrder,
        requiredRoles: roles.trim() ? roles.split(',').map(r => r.trim()).filter(Boolean) : [] 
      };

      if (initialData) {
        await menuApi.updateMenu(initialData.id, payload);
      } else {
        await menuApi.createMenu(payload);
      }
      window.dispatchEvent(new Event('navigation-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("API Error Details:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to save changes. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.2 }}
          onClick={onClose} 
          className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" 
        />

        {/* Modal Container - 🌟 Changed to max-w-md for a sleeker, tighter layout */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 15 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.96, y: 15 }} 
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border border-white"
        >
          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-inner border border-blue-100/50">
                <LayoutGrid size={18} strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight leading-tight">
                  {initialData ? "Edit Menu" : "Add Menu Item"}
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  Sidebar Navigation
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors active:scale-90"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Form Body - 🌟 Completely stacked layout as requested */}
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar relative z-10 flex-1">
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }} 
                  animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} 
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-[12px] font-bold text-red-600 flex items-center gap-2">
                    <div className="p-1 bg-red-100 rounded-md shrink-0"><X size={12} /></div>
                    {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Title Input */}
            <div>
              <label className={LABEL_CLASS}>
                <span className="flex items-center gap-1.5"><Type size={12} className="text-blue-500" /> Menu Title *</span>
              </label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className={INPUT_CLASS} 
                placeholder="e.g., Overview, Settings" 
                autoFocus
              />
            </div>

            {/* Icon Name - 🌟 Stacked */}
            <div>
              <label className={LABEL_CLASS}>
                <span className="flex items-center gap-1.5"><ImageIcon size={12} className="text-blue-500" /> Icon Name</span>
              </label>
              <input 
                value={icon} 
                onChange={e => setIcon(e.target.value)} 
                className={INPUT_CLASS} 
                placeholder="e.g., LayoutDashboard" 
              />
            </div>

            {/* Sort Order - 🌟 Directly under Icon Name */}
            <div>
              <label className={LABEL_CLASS}>
                <span className="flex items-center gap-1.5"><Layers size={12} className="text-blue-500" /> Sort Order</span>
              </label>
              <input 
                type="number" 
                value={sortOrder} 
                onChange={e => setSortOrder(parseInt(e.target.value) || 0)} 
                className={INPUT_CLASS} 
              />
            </div>

            {/* Route Input */}
            <div>
              <label className={LABEL_CLASS}>
                <span className="flex items-center gap-1.5"><Link size={12} className="text-blue-500" /> URL Route</span>
                <span className="text-[9px] text-slate-300 normal-case font-semibold">(Optional)</span>
              </label>
              <input 
                value={route} 
                onChange={e => setRoute(e.target.value)} 
                className={INPUT_CLASS} 
                placeholder="e.g., /dashboard" 
              />
            </div>

            {/* Parent Selection */}
            <div>
              <label className={LABEL_CLASS}>
                <span className="flex items-center gap-1.5"><LayoutGrid size={12} className="text-blue-500" /> Parent Menu</span>
                <span className="text-[9px] text-slate-300 normal-case font-semibold">(Optional)</span>
              </label>
              <select 
                value={parentId} 
                onChange={e => setParentId(e.target.value)} 
                className={`${INPUT_CLASS} appearance-none cursor-pointer`}
              >
                <option value="">-- None (Root Level) --</option>
                {parentOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.title}</option>
                ))}
              </select>
            </div>

            {/* Roles Input */}
            <div>
              <label className={LABEL_CLASS}>
                <span className="flex items-center gap-1.5"><Shield size={12} className="text-emerald-500" /> Required Roles</span>
                <span className="text-[9px] text-slate-300 normal-case font-semibold">(Optional)</span>
              </label>
              <input 
                value={roles} 
                onChange={e => setRoles(e.target.value)} 
                className={INPUT_CLASS} 
                placeholder="e.g., Admin, HR" 
              />
              <span className="text-[9px] font-bold text-slate-400 mt-1.5 ml-1 flex items-start gap-1.5 leading-tight">
                <span className="bg-slate-100 text-slate-500 px-1 py-0.5 rounded border border-slate-200 uppercase shrink-0 mt-0.5">Tip</span>
                <span>Comma separated. Leave blank for public access.</span>
              </span>
            </div>
          </div>

          {/* 🌟 Footer Actions - Reduced button size for a refined look */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-5 py-4 shrink-0">
            <button 
              onClick={onClose} 
              disabled={loading} 
              className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors active:scale-95 bg-white border border-slate-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={loading} 
              className={`flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-6 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-blue-700 transition-all active:scale-95
                ${loading ? 'opacity-80 cursor-not-allowed' : ''}
              `}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.5} />} 
              {initialData ? "Update" : "Save"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}