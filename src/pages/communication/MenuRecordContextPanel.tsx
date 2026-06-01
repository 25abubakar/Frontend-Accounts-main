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

        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "Patient #101",      type: "Patient",     id: "101"  },
            { label: "Claim #5001",       type: "Claim",       id: "5001" },
            { label: "Appointment #9002", type: "Appointment", id: "9002" },
          ].map(({ label, type, id }) => (
            <button
              key={label}
              onClick={() => onRecordChange(type, id)}
              className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
                currentEntityType === type && currentEntityId === id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          Selected: {currentEntityType || "—"} #{currentEntityId || "—"}
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
