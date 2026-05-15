import { useState } from "react";
import { Save, Globe2, Clock, Building2 } from "lucide-react";

const TIMEZONES = [
  "UTC", "Asia/Karachi", "Asia/Kolkata", "Asia/Dubai",
  "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney",
];
const LANGUAGES = ["English", "Urdu", "Arabic", "Hindi", "French"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

export default function GeneralPreferences() {
  const [portalName, setPortalName]   = useState("LAL Group Master Portal");
  const [timezone, setTimezone]       = useState("Asia/Karachi");
  const [language, setLanguage]       = useState("English");
  const [dateFormat, setDateFormat]   = useState("DD/MM/YYYY");
  const [saved, setSaved]             = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-black text-slate-800">General Preferences</h1>
        <p className="mt-1 text-sm font-medium text-slate-400">Configure portal-wide defaults for your organization.</p>

        <div className="mt-8 space-y-6">

          {/* Portal Name */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Building2 size={18} className="text-blue-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Portal Identity</h2>
                <p className="text-xs text-slate-400">Displayed in the navbar and browser tab</p>
              </div>
            </div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Portal Name</label>
            <input
              value={portalName}
              onChange={e => setPortalName(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          {/* Locale */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <Globe2 size={18} className="text-emerald-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Locale & Region</h2>
                <p className="text-xs text-slate-400">Language, timezone and date formatting</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Language",    value: language,    set: setLanguage,    opts: LANGUAGES },
                { label: "Timezone",    value: timezone,    set: setTimezone,    opts: TIMEZONES },
                { label: "Date Format", value: dateFormat,  set: setDateFormat,  opts: DATE_FORMATS },
              ].map(({ label, value, set, opts }) => (
                <div key={label}>
                  <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">{label}</label>
                  <select
                    value={value}
                    onChange={e => set(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold focus:border-blue-500 focus:bg-white focus:outline-none"
                  >
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Timezone visual */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Clock size={18} className="text-indigo-500" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">Current Server Time</h2>
                <p className="text-xs text-slate-400">Based on selected timezone: <strong>{timezone}</strong></p>
              </div>
            </div>
            <p className="text-2xl font-black text-slate-700">
              {new Date().toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {new Date().toLocaleDateString("en-US", { timeZone: timezone, weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <button
            onClick={handleSave}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-md transition-all ${saved ? "bg-emerald-500" : "bg-[#00A3FF] hover:bg-blue-600"}`}
          >
            <Save size={16} />
            {saved ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
