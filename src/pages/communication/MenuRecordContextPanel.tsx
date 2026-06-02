import { useState } from "react";
import { Search, X } from "lucide-react";
import type { AppNoteDto } from "../../models/appNoteModels";
import type { MenuDto } from "../../models/menuModels";

interface Props {
  notes: AppNoteDto[];
  menus: MenuDto[];
  currentMenuCode?: string | null;
  currentEntityType?: string | null;
  currentEntityId?: string | null;
  onMenuChange: (menuCode: string) => void;
  onRecordChange: (entityType: string, entityId: string) => void;
}

export function MenuRecordContextPanel({
  notes,
  menus,
  currentMenuCode,
  currentEntityType,
  currentEntityId,
  onMenuChange,
  onRecordChange,
}: Props) {
  const [entityTypeInput, setEntityTypeInput] = useState(currentEntityType || "");
  const [entityIdInput,   setEntityIdInput]   = useState(currentEntityId   || "");

  const applyRecord = () => {
    const t = entityTypeInput.trim();
    const i = entityIdInput.trim();
    if (t && i) onRecordChange(t, i);
  };

  const clearRecord = () => {
    setEntityTypeInput("");
    setEntityIdInput("");
    onRecordChange("", "");
  };
  // General notes (no menu, no entity) + notes matching current menu
  const menuNotes = notes.filter(x => {
    if (x.isDismissed) return false;
    // General note — no menu and no entity restriction
    if (!x.menuCode && !x.entityType) return true;
    // Menu-linked note — only show when menu matches
    if (x.menuCode && x.menuCode === currentMenuCode) return true;
    return false;
  });

  // Notes linked to the currently selected record
  const recordNotes = notes.filter(x => {
    if (x.isDismissed) return false;
    return (
      x.entityType === currentEntityType &&
      x.entityId === currentEntityId
    );
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Menu context */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 font-extrabold text-slate-900">Current Menu</div>

        <select
          className="mb-4 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none"
          value={currentMenuCode || ""}
          onChange={e => onMenuChange(e.target.value)}
        >
          <option value="">General (All Menus)</option>
          {menus.map(menu => (
            <option key={menu.menuCode} value={menu.menuCode}>
              {menu.menuName}
            </option>
          ))}
        </select>

        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          Menu / General Notes
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {menuNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">
              No notes for this menu.
            </div>
          ) : (
            menuNotes.map(note => (
              <div key={note.noteId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    note.priorityCode === "CRITICAL" ? "bg-red-500" :
                    note.priorityCode === "HIGH" ? "bg-amber-400" :
                    note.priorityCode === "LOW" ? "bg-slate-400" : "bg-blue-500"
                  }`} />
                  <span className="text-xs font-bold text-slate-500 uppercase">{note.sourceTypeCode}</span>
                  {!note.isRead && note.sourceTypeCode === "ADMIN" && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-black text-blue-600">UNREAD</span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-800">{note.title}</div>
                <div className="mt-1 text-xs text-slate-600 line-clamp-2">{note.noteBody}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Record context */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-3 font-extrabold text-slate-900">Current Record</div>

        {/* Free-form record lookup — no hardcoded demo data */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Record Type
            </label>
            <input
              value={entityTypeInput}
              onChange={e => setEntityTypeInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyRecord()}
              placeholder="e.g. Patient, Claim…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Record ID
            </label>
            <input
              value={entityIdInput}
              onChange={e => setEntityIdInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyRecord()}
              placeholder="e.g. 101"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-1">
            <button
              onClick={applyRecord}
              disabled={!entityTypeInput.trim() || !entityIdInput.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              <Search size={12} /> Filter
            </button>
            {(currentEntityType || currentEntityId) && (
              <button
                onClick={clearRecord}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          {currentEntityType && currentEntityId
            ? <>Showing notes for: <span className="text-blue-600">{currentEntityType} #{currentEntityId}</span></>
            : "Selected: —"
          }
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {recordNotes.length === 0 ? (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-500">
              No record-specific notes.
            </div>
          ) : (
            recordNotes.map(note => (
              <div key={note.noteId} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-block h-2 w-2 rounded-full ${
                    note.priorityCode === "CRITICAL" ? "bg-red-500" :
                    note.priorityCode === "HIGH" ? "bg-amber-400" : "bg-blue-500"
                  }`} />
                  <span className="text-xs font-bold text-slate-500 uppercase">{note.sourceTypeCode}</span>
                </div>
                <div className="text-sm font-bold text-slate-800">{note.title}</div>
                <div className="mt-1 text-xs text-slate-600 line-clamp-2">{note.noteBody}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
