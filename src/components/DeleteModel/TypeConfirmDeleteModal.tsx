import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName?: string;
}

export default function TypeConfirmDeleteModal({ isOpen, onClose, onConfirm, itemName = "record" }: Props) {
  const [inputValue, setInputValue] = useState("");
  const themeColor = '#F43F5E';
  const shadowColor = 'rgba(244,63,94,0.4)';

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) setInputValue("");
  }, [isOpen]);

  const isConfirmed = inputValue.trim().toLowerCase() === "delete";

  const handleConfirm = () => {
    if (isConfirmed) onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          {/* White Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[3rem] w-full max-w-[380px] p-10 flex flex-col items-center text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden z-10"
          >
            {/* Icon & Bubbles Container */}
            <div className="relative w-24 h-24 mb-6 mt-0">
              <div className="absolute -top-3 left-2 w-5 h-5 rounded-full opacity-90 animate-pulse" style={{ backgroundColor: themeColor }} />
              <div className="absolute top-4 -right-4 w-6 h-6 rounded-full opacity-90 animate-pulse delay-75" style={{ backgroundColor: themeColor }} />
              <div className="absolute -bottom-5 left-4 w-5 h-5 rounded-full opacity-90 animate-pulse delay-150" style={{ backgroundColor: themeColor }} />
              <div className="absolute top-1/2 -left-6 w-2.5 h-2.5 rounded-full opacity-90 animate-pulse delay-200" style={{ backgroundColor: themeColor }} />
              
              {/* Main Circle */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center z-10"
                style={{ backgroundColor: themeColor, boxShadow: `0 15px 35px -5px ${shadowColor}` }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </div>
            </div>

            {/* Text Content */}
            <h2 className="text-[24px] font-extrabold text-[#2A333A] leading-[1.2] mb-3 tracking-tight">
              Delete Record?
            </h2>

            <p className="text-[13px] font-medium text-[#64748B] leading-relaxed px-2 mb-6">
              You are about to delete <span className="font-bold text-slate-700">{itemName}</span>. This will delete all sub-entities inside it.
            </p>

            {/* 🌟 Type To Confirm Input */}
            <div className="w-full">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#F43F5E] mb-2 block">
                Type <span className="font-black">delete</span> to confirm
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type 'delete'..."
                className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-center text-[#F43F5E] focus:border-[#F43F5E] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex w-full gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 font-extrabold text-[13px] uppercase tracking-wider hover:bg-slate-200 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isConfirmed}
                className="flex-1 py-3.5 rounded-2xl text-white font-extrabold text-[13px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed active:scale-95"
                style={{ 
                  backgroundColor: themeColor, 
                  boxShadow: isConfirmed ? `0 10px 25px -5px ${shadowColor}` : 'none' 
                }}
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}