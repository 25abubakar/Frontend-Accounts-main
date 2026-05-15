import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  autoClose?: number; // Optional: close after X milliseconds
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ 
  isOpen, 
  onClose, 
  title = "Success!", 
  message, 
  autoClose = 3000 
}) => {
  
  // Auto-close logic
  useEffect(() => {
    if (isOpen && autoClose > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* POPUP CARD */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.4 }}
            className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
          >
            {/* CLOSE BUTTON */}
            <button 
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              {/* ANIMATED ICON */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
              >
                <CheckCircle2 size={32} strokeWidth={2.5} />
              </motion.div>

              {/* TEXT CONTENT */}
              <h3 className="text-lg font-bold text-[#0B1B3D]">
                {title}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">
                {message}
              </p>

              {/* ACTION BUTTON */}
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-[#00A3FF] py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-[#008DE6] active:scale-[0.98]"
              >
                Continue
              </button>
            </div>

            {/* PROGRESS BAR (Visual indicator of auto-close) */}
            {autoClose > 0 && (
              <motion.div 
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: autoClose / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-emerald-500"
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SuccessPopup;