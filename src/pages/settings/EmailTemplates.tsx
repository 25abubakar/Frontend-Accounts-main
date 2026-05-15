import { useState } from "react";
import { Mail, Save, Eye } from "lucide-react";

const TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to LAL Group Portal",
    body: `Dear {{fullName}},\n\nWelcome to the LAL Group Master Portal. Your account has been created successfully.\n\nYour role: {{role}}\nPortal URL: https://portal.lalgroup.com\n\nBest regards,\nLAL Group HR Team`,
  },
  {
    id: "hire",
    name: "Hiring Confirmation",
    subject: "You have been assigned to {{jobTitle}}",
    body: `Dear {{fullName}},\n\nCongratulations! You have been hired as {{jobTitle}} at {{branchName}}, {{companyName}}.\n\nVacancy Code: {{vacancyCode}}\nJoining Date: {{joiningDate}}\n\nWelcome aboard!\nLAL Group HR`,
  },
  {
    id: "transfer",
    name: "Transfer Notice",
    subject: "Position Transfer — {{jobTitle}}",
    body: `Dear {{fullName}},\n\nThis is to inform you that your position has been transferred.\n\nNew Role: {{newJobTitle}}\nNew Branch: {{newBranch}}\n\nPlease report to your new department on the effective date.\n\nRegards,\nLAL Group Management`,
  },
];

export default function EmailTemplates() {
  const [selected, setSelected] = useState(TEMPLATES[0].id);
  const [templates, setTemplates] = useState(TEMPLATES);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  const current = templates.find(t => t.id === selected)!;

  const update = (field: "subject" | "body", value: string) => {
    setTemplates(prev => prev.map(t => t.id === selected ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8 custom-scrollbar">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-black text-slate-800">Email Templates</h1>
        <p className="mt-1 text-sm font-medium text-slate-400">
          Customize automated emails sent to staff. Use <code className="bg-slate-100 px-1 rounded text-xs">{"{{variable}}"}</code> for dynamic values.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4">

          {/* Template list */}
          <div className="sm:col-span-1 space-y-2">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-xs font-bold transition-all ${
                  selected === t.id
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Mail size={12} className="inline mr-1.5" />
                {t.name}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="sm:col-span-3 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-slate-800">{current.name}</h2>
                <button
                  onClick={() => setPreview(!preview)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  <Eye size={13} /> {preview ? "Edit" : "Preview"}
                </button>
              </div>

              {preview ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-700 whitespace-pre-wrap">
                  <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Subject</p>
                  <p className="mb-4 font-bold text-slate-800">{current.subject}</p>
                  <p className="text-xs font-black text-slate-400 mb-2 uppercase tracking-widest">Body</p>
                  <p className="whitespace-pre-wrap">{current.body}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Subject Line</label>
                    <input
                      value={current.subject}
                      onChange={e => update("subject", e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:border-blue-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">Email Body</label>
                    <textarea
                      rows={10}
                      value={current.body}
                      onChange={e => update("body", e.target.value)}
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono font-medium focus:border-blue-500 focus:bg-white focus:outline-none resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleSave}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black text-white shadow-md transition-all ${saved ? "bg-emerald-500" : "bg-[#00A3FF] hover:bg-blue-600"}`}
            >
              <Save size={16} />
              {saved ? "Saved!" : "Save Template"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
