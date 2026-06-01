import { useEffect, useState } from "react";
import type { CreateAppNoteRequest, AppNoteTargetRequest } from "../../models/appNoteModels";
import type { LookupDto } from "../../models/lookupModels";
import type { MenuDto } from "../../models/menuModels";

interface Props {
  sourceTypeCode: "ADMIN" | "USER";
  menus: MenuDto[];
  getLookup: (lookupTypeCode: string) => LookupDto[];
  getDefault: (lookupTypeCode: string) => string;
  currentMenuCode?: string | null;
  currentEntityType?: string | null;
  currentEntityId?: string | null;
  onCancel: () => void;
  onSubmit: (request: CreateAppNoteRequest) => void;
}

const INP = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all";
const LBL = "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block";

export function NoteForm({
  sourceTypeCode, menus, getLookup, getDefault,
  currentMenuCode, currentEntityType, currentEntityId,
  onCancel, onSubmit,
}: Props) {
  const [title, setTitle]                   = useState("");
  const [noteBody, setNoteBody]             = useState("");
  const [noteTypeCode, setNoteTypeCode]     = useState("");
  const [priorityCode, setPriorityCode]     = useState("");
  const [visibilityTypeCode, setVisibility] = useState("");
  const [categoryCode, setCategoryCode]     = useState("");
  const [menuCode, setMenuCode]             = useState("");
  const [entityType, setEntityType]         = useState("");
  const [entityId, setEntityId]             = useState("");
  const [requireAck, setRequireAck]         = useState(false);
  const [isPinned, setIsPinned]             = useState(false);
  const [isPopup, setIsPopup]               = useState(false);
  const [startDate, setStartDate]           = useState("");
  const [endDate, setEndDate]               = useState("");
  const [error, setError]                   = useState<string | null>(null);

  // Targeting (for ADMIN notes)
  const [targetMode, setTargetMode]         = useState<"ALL" | "MENU" | "RECORD">("ALL");

  useEffect(() => {
    setNoteTypeCode(sourceTypeCode === "ADMIN" ? "INSTRUCTION" : "USER_NOTE");
    setPriorityCode(getDefault("PRIORITY") || "NORMAL");
    setVisibility(sourceTypeCode === "ADMIN" ? "GENERAL" : "PRIVATE");
    setCategoryCode(getDefault("CATEGORY") || "GENERAL");
    setMenuCode(currentMenuCode || "");
    setEntityType(sourceTypeCode === "USER" ? (currentEntityType || "") : "");
    setEntityId(sourceTypeCode === "USER" ? (currentEntityId || "") : "");
    setRequireAck(sourceTypeCode === "ADMIN");
    setTargetMode("ALL");
  }, [sourceTypeCode]);

  // Auto-set visibility based on target mode
  useEffect(() => {
    if (sourceTypeCode !== "ADMIN") return;
    if (targetMode === "ALL")    setVisibility("GENERAL");
    if (targetMode === "MENU")   setVisibility("MENU");
    if (targetMode === "RECORD") setVisibility("RECORD");
  }, [targetMode, sourceTypeCode]);

  const buildTargets = (): AppNoteTargetRequest[] => {
    if (targetMode === "ALL")    return [{ targetTypeCode: "ALL", targetValue: "*" }];
    if (targetMode === "MENU")   return menuCode ? [{ targetTypeCode: "MENU", targetValue: menuCode }] : [];
    if (targetMode === "RECORD") return entityType && entityId ? [{ targetTypeCode: "RECORD", targetValue: `${entityType}:${entityId}` }] : [];
    return [];
  };

  const submit = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!noteBody.trim()) { setError("Message body is required."); return; }
    if (!noteTypeCode) { setError("Note type is required."); return; }
    if (!priorityCode) { setError("Priority is required."); return; }
    if (!visibilityTypeCode) { setError("Visibility is required."); return; }
    setError(null);

    onSubmit({
      title: title.trim(),
      noteBody: noteBody.trim(),
      noteTypeCode,
      sourceTypeCode,
      categoryCode: categoryCode || null,
      priorityCode,
      visibilityTypeCode,
      menuCode: menuCode || null,
      moduleName: null,
      entityType: entityType || null,
      entityId: entityId || null,
      startDateUtc: startDate || null,
      endDateUtc: endDate || null,
      isPublished: true,
      isPinned,
      isPopup,
      requireAcknowledgement: requireAck,
      allowDismiss: true,
      targets: buildTargets(),
    });
  };

  const menuOptions: LookupDto[] = menus.map(x => ({
    lookupTypeCode: "MENU",
    valueCode: x.menuCode,
    displayText: x.menuName,
    sortOrder: x.sortOrder,
    isDefault: false,
  }));

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Scope selector for ADMIN */}
      {sourceTypeCode === "ADMIN" && (
        <div>
          <label className={LBL}>Scope / Visibility</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { mode: "ALL" as const,    label: "🌍 General",      desc: "Show everywhere" },
              { mode: "MENU" as const,   label: "📋 Menu Specific", desc: "Only on selected menu" },
              { mode: "RECORD" as const, label: "🔗 Record Specific", desc: "Only on selected record" },
            ].map(({ mode, label, desc }) => (
              <button key={mode} type="button" onClick={() => setTargetMode(mode)}
                className={`rounded-xl border-2 p-2.5 text-center transition-all ${
                  targetMode === mode
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}>
                <div className="text-xs font-black">{label}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Note Type — from lookup */}
        <div>
          <label className={LBL}>Note Type *</label>
          <select value={noteTypeCode} onChange={e => setNoteTypeCode(e.target.value)} className={INP}>
            <option value="">Select type…</option>
            {getLookup("NOTE_TYPE").map(x => (
              <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
            ))}
          </select>
        </div>

        {/* Priority — from lookup */}
        <div>
          <label className={LBL}>Priority *</label>
          <select value={priorityCode} onChange={e => setPriorityCode(e.target.value)} className={INP}>
            <option value="">Select priority…</option>
            {getLookup("PRIORITY").map(x => (
              <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
            ))}
          </select>
        </div>

        {/* Category — from lookup */}
        <div>
          <label className={LBL}>Category</label>
          <select value={categoryCode} onChange={e => setCategoryCode(e.target.value)} className={INP}>
            <option value="">Select category…</option>
            {getLookup("CATEGORY").map(x => (
              <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
            ))}
          </select>
        </div>

        {/* Visibility — from lookup */}
        <div>
          <label className={LBL}>Visibility *</label>
          <select value={visibilityTypeCode} onChange={e => setVisibility(e.target.value)} className={INP}>
            <option value="">Select visibility…</option>
            {getLookup("VISIBILITY_TYPE").map(x => (
              <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
            ))}
          </select>
        </div>

        {/* Menu Link — from API */}
        <div>
          <label className={LBL}>Menu Link</label>
          <select value={menuCode} onChange={e => setMenuCode(e.target.value)} className={INP}>
            <option value="">General / No Menu</option>
            {menuOptions.map(x => (
              <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>
            ))}
          </select>
        </div>

        {/* Entity Type */}
        <div>
          <label className={LBL}>Entity Type</label>
          <input value={entityType} onChange={e => setEntityType(e.target.value)}
            placeholder="Patient, Claim, Appointment…" className={INP} />
        </div>

        {/* Entity ID */}
        <div>
          <label className={LBL}>Entity ID</label>
          <input value={entityId} onChange={e => setEntityId(e.target.value)}
            placeholder="101" className={INP} />
        </div>

        {/* Start Date */}
        <div>
          <label className={LBL}>Start Date (Optional)</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={INP} />
        </div>

        {/* End Date */}
        <div>
          <label className={LBL}>End Date (Optional)</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={INP} />
        </div>
      </div>

      {/* Title */}
      <div>
        <label className={LBL}>Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Enter title…" className={INP} />
      </div>

      {/* Body */}
      <div>
        <label className={LBL}>Message *</label>
        <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)} rows={4}
          placeholder="Write your instruction or note here…"
          className={`${INP} resize-none`} />
      </div>

      {/* Options */}
      <div className="flex flex-wrap gap-5">
        {[
          { label: "Require Acknowledgement", value: requireAck, set: setRequireAck },
          { label: "Pin to Top",              value: isPinned,   set: setIsPinned   },
          { label: "Show as Popup",           value: isPopup,    set: setIsPopup    },
        ].map(({ label, value, set }) => (
          <label key={label} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
            <input type="checkbox" checked={value} onChange={e => set(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
            {label}
          </label>
        ))}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button type="button" onClick={submit}
          className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700">
          Save Note
        </button>
      </div>
    </div>
  );
}
