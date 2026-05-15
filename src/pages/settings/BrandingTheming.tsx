import { useState } from "react";
import { Palette, Save, Check } from "lucide-react";

const ACCENT_COLORS = [
  { name: "Sky Blue",    value: "#00A3FF", bg: "bg-[#00A3FF]" },
  { name: "Indigo",      value: "#6366F1", bg: "bg-indigo-500" },
  { name: "Emerald",     value: "#10B981", bg: "bg-emerald-500" },
  { name: "Rose",        value: "#F43F5E", bg: "bg-rose-500" },
  { name: "Amber",       value: "#F59E0B", bg: "bg-amber-500" },
  { name: "Slate",       value: "#475569", bg: "bg-slate-600" },
];

const FONT_OPTIONS = ["Inter", "Poppins", "Roboto", "DM Sans", "Nunito"];

export default function BrandingTheming() {
  const [accent, setAccent]   = useState("#00A3FF");
  const [font, setFont]       = useState("Inter");
  const [darkMode, setDark]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-black text-slate-800">Branding & Theming</h1>
        <p className="mt-1 text-sm font-medium text-slate-400">Customize the look and feel of the portal.</p>

        <div className="mt-8 space-y-6">

          {/* Accent Color */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                <Palette size={18} className="text-violet-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Accent Color</h2>
                <p className="text-xs text-slate-400">Used for buttons, active states and highlights</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setAccent(c.value)}
                  title={c.name}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} shadow-sm transition-transform hover:scale-110 ring-2 ${accent === c.value ? "ring-slate-800 ring-offset-2" : "ring-transparent"}`}
                >
                  {accent === c.value && <Check size={16} className="text-white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Selected: <span className="font-black text-slate-700">{ACCENT_COLORS.find(c => c.value === accent)?.name}</span>
            </p>
          </div>

          {/* Font */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-1">Typography</h2>
            <p className="text-xs text-slate-400 mb-4">Portal-wide font family</p>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map(f => (
                <button
                  key={f}
                  onClick={() => setFont(f)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                    font === f
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Dark Mode toggle */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800">Dark Mode</h2>
              <p className="text-xs text-slate-400 mt-0.5">Switch the portal to a dark theme</p>
            </div>
            <button
              onClick={() => setDark(!darkMode)}
              className={`relative h-7 w-12 rounded-full transition-colors duration-300 ${darkMode ? "bg-blue-500" : "bg-slate-200"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${darkMode ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-4">Preview</h2>
            <div className="rounded-xl p-4 border border-slate-100" style={{ backgroundColor: darkMode ? "#1e293b" : "#f8fafc" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: accent }}>L</div>
                <span className="font-black text-sm" style={{ color: darkMode ? "#f1f5f9" : "#0f172a", fontFamily: font }}>LAL Group Portal</span>
              </div>
              <button className="rounded-lg px-4 py-2 text-xs font-black text-white" style={{ backgroundColor: accent }}>
                Sample Button
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-md transition-all ${saved ? "bg-emerald-500" : "bg-[#00A3FF] hover:bg-blue-600"}`}
          >
            <Save size={16} />
            {saved ? "Saved!" : "Save Theme"}
          </button>
        </div>
      </div>
    </div>
  );
}
