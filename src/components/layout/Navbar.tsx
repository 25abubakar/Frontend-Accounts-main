import { useState, useRef, useEffect } from "react";
// 🌟 FIX: Imported Info and Lock icons to match your design
import { Palette, Check, Menu, X, Info, Lock } from "lucide-react";
import ProfileDropdown from "./ProfileDropdown"; 
import NotesDrawer from "./NotesDrawer"; 

type ThemeOption = { name: string; bg: string; dot: string; text: string };

const THEME_OPTIONS: ThemeOption[] = [
  { name: "Blue",    bg: "bg-blue-600",    dot: "bg-blue-500",    text: "text-blue-600" },
  { name: "Emerald", bg: "bg-emerald-600", dot: "bg-emerald-500", text: "text-emerald-600" },
  { name: "Slate",   bg: "bg-slate-800",   dot: "bg-slate-600",   text: "text-slate-700" },
  { name: "Indigo",  bg: "bg-indigo-600",  dot: "bg-indigo-500",  text: "text-indigo-600" },
];

interface NavbarProps {
  toggleSidebar: () => void;
  themeColor: string;
  setThemeColor: (color: string) => void;
}

export default function Navbar({ toggleSidebar, themeColor, setThemeColor }: NavbarProps) {
  const [showTheme, setShowTheme] = useState(false);
  
  // Drawer State Management
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<"left" | "right">("right");

  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowTheme(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInstructionsClick = () => {
    setDrawerSide("left");  
    setIsDrawerOpen(true);
  };

  const handleNotesClick = () => {
    setDrawerSide("right"); 
    setIsDrawerOpen(true);
  };

  return (
    <>
      <header
        className={`
          ${themeColor} shrink-0 z-30
          flex items-center justify-between
          px-3 sm:px-5
          h-14 sm:h-16
          shadow-md transition-colors duration-300
          safe-top
        `}
      >
        {/* Left — hamburger + title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle menu"
            className="p-2 rounded-xl hover:bg-white/15 active:scale-90 transition-all shrink-0 touch-manipulation"
          >
            <Menu size={20} className="text-white" />
          </button>

          <div className="min-w-0">
            <span className="font-black text-sm sm:text-base tracking-tight uppercase italic text-white leading-none truncate block">
              LAL Group
              <span className="text-white/50 font-light text-[10px] ml-1 not-italic normal-case">Portal</span>
            </span>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

          {/* 🌟 UPDATED: Instructions Button */}
          <button
            onClick={handleInstructionsClick}
            aria-label="Open Instructions"
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all shadow-sm"
          >
            <Info size={16} strokeWidth={2.5} className="text-white" />
            <span className="text-xs font-bold text-white tracking-wide">Instructions</span>
          </button>

          {/* 🌟 UPDATED: My Notes Button */}
          <button
            onClick={handleNotesClick}
            aria-label="Open Notes"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 active:scale-95 transition-all shadow-sm"
          >
            <Lock size={15} strokeWidth={2.5} className="text-white" />
            <span className="hidden sm:block text-xs font-bold text-white tracking-wide">My Notes</span>
          </button>

          {/* Theme picker */}
          <div ref={themeRef} className="relative ml-1">
            <button
              onClick={() => setShowTheme(v => !v)}
              aria-label="Change theme"
              title="Theme"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 active:scale-90 transition-all touch-manipulation shadow-sm"
            >
              <Palette size={16} className="text-white" />
            </button>

            {showTheme && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50">
                <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Theme</span>
                  <button onClick={() => setShowTheme(false)} className="text-slate-300 hover:text-slate-500">
                    <X size={13} />
                  </button>
                </div>
                {THEME_OPTIONS.map(opt => (
                  <button
                    key={opt.bg}
                    onClick={() => { setThemeColor(opt.bg); setShowTheme(false); }}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full ${opt.dot} shadow-sm`} />
                      <span className="text-sm font-semibold text-slate-700">{opt.name}</span>
                    </div>
                    {themeColor === opt.bg && <Check size={14} className={opt.text} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-white/20 mx-0.5" />

          <ProfileDropdown />
          
        </div>
      </header>

      <NotesDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        side={drawerSide}
      />
    </>
  );
}