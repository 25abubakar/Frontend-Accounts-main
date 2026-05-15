import { useState } from "react";
import { Link2, CheckCircle2, XCircle, Save } from "lucide-react";

const INTEGRATIONS = [
  { id: "smtp",    name: "SMTP Email",       desc: "Send automated emails via your mail server",   enabled: true  },
  { id: "slack",   name: "Slack",            desc: "Post notifications to Slack channels",          enabled: false },
  { id: "teams",   name: "Microsoft Teams",  desc: "Send alerts to Teams channels",                 enabled: false },
  { id: "s3",      name: "AWS S3",           desc: "Store staff photos and documents in S3",        enabled: false },
  { id: "sentry",  name: "Sentry",           desc: "Error monitoring and crash reporting",          enabled: false },
];

export default function IntegrationSetup() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [smtpHost, setSmtpHost]   = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort]   = useState("587");
  const [smtpUser, setSmtpUser]   = useState("");
  const [saved, setSaved]         = useState(false);

  const toggle = (id: string) =>
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled: !i.enabled } : i));

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-black text-slate-800">Integration Setup</h1>
        <p className="mt-1 text-sm font-medium text-slate-400">Connect third-party services to extend portal functionality.</p>

        <div className="mt-8 space-y-4">
          {integrations.map(intg => (
            <div key={intg.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${intg.enabled ? "bg-emerald-50" : "bg-slate-100"}`}>
                    <Link2 size={18} className={intg.enabled ? "text-emerald-500" : "text-slate-400"} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{intg.name}</p>
                    <p className="text-xs font-medium text-slate-400">{intg.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {intg.enabled
                    ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : <XCircle size={16} className="text-slate-300" />
                  }
                  <button
                    onClick={() => toggle(intg.id)}
                    className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${intg.enabled ? "bg-emerald-500" : "bg-slate-200"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${intg.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* SMTP config inline */}
              {intg.id === "smtp" && intg.enabled && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-slate-100 pt-4">
                  {[
                    { label: "SMTP Host", value: smtpHost, set: setSmtpHost, placeholder: "smtp.gmail.com" },
                    { label: "Port",      value: smtpPort, set: setSmtpPort, placeholder: "587" },
                    { label: "Username",  value: smtpUser, set: setSmtpUser, placeholder: "you@company.com" },
                  ].map(({ label, value, set, placeholder }) => (
                    <div key={label}>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">{label}</label>
                      <input
                        value={value}
                        onChange={e => set(e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold focus:border-blue-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className={`mt-6 flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-md transition-all ${saved ? "bg-emerald-500" : "bg-[#00A3FF] hover:bg-blue-600"}`}
        >
          <Save size={16} />
          {saved ? "Saved!" : "Save Integrations"}
        </button>
      </div>
    </div>
  );
}
