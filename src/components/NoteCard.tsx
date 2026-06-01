import type { AppNoteDto } from "../models/appNoteModels";

interface Props {
  note: AppNoteDto;
  getText: (lookupTypeCode: string, valueCode?: string | null) => string;
  onMarkRead: (noteId: number) => void;
  onAcknowledge: (noteId: number) => void;
  onDismiss: (noteId: number) => void;
}

const PRIORITY_LEFT: Record<string, string> = {
  CRITICAL: "border-l-red-600",
  HIGH:     "border-l-amber-500",
  NORMAL:   "border-l-blue-500",
  LOW:      "border-l-slate-400",
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  HIGH:     "bg-amber-100 text-amber-700 border-amber-200",
  NORMAL:   "bg-blue-100 text-blue-700 border-blue-200",
  LOW:      "bg-slate-100 text-slate-600 border-slate-200",
};

export function NoteCard({ note, getText, onMarkRead, onAcknowledge, onDismiss }: Props) {
  const priority = (note.priorityCode || "NORMAL").toUpperCase();
  const leftBorder = PRIORITY_LEFT[priority] ?? PRIORITY_LEFT.NORMAL;
  const priorityBadge = PRIORITY_BADGE[priority] ?? PRIORITY_BADGE.NORMAL;
  const isUnread = note.sourceTypeCode === "ADMIN" && !note.isRead;

  return (
    <div className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm transition-all hover:shadow-md ${leftBorder} ${isUnread ? "ring-1 ring-blue-100" : ""}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {/* Source badge */}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${
              note.sourceTypeCode === "ADMIN"
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-purple-100 text-purple-700 border-purple-200"
            }`}>
              {getText("SOURCE_TYPE", note.sourceTypeCode) || note.sourceTypeCode}
            </span>

            {/* Note type */}
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {getText("NOTE_TYPE", note.noteTypeCode) || note.noteTypeCode}
            </span>

            {/* Priority */}
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${priorityBadge}`}>
              {getText("PRIORITY", note.priorityCode) || note.priorityCode}
            </span>

            {/* Visibility */}
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {getText("VISIBILITY_TYPE", note.visibilityTypeCode) || note.visibilityTypeCode}
            </span>

            {/* Menu link */}
            {note.menuCode && (
              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                📋 {note.menuCode}
              </span>
            )}

            {/* Record link */}
            {note.entityType && note.entityId && (
              <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                🔗 {note.entityType} #{note.entityId}
              </span>
            )}

            {/* Ack required */}
            {note.requireAcknowledgement && !note.isAcknowledged && (
              <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">
                ACK REQUIRED
              </span>
            )}

            {/* Read status */}
            {note.sourceTypeCode === "ADMIN" && (
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${
                note.isRead
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : "bg-amber-100 text-amber-700 border-amber-200"
              }`}>
                {note.isRead ? "✓ Read" : "Unread"}
              </span>
            )}

            {/* Acknowledged */}
            {note.isAcknowledged && (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                ✓ Acknowledged
              </span>
            )}

            {/* Pinned */}
            {note.isPinned && (
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                📌 Pinned
              </span>
            )}
          </div>

          <div className={`text-sm font-extrabold ${isUnread ? "text-slate-900" : "text-slate-800"}`}>
            {note.title}
          </div>
        </div>

        <div className="shrink-0 text-[10px] text-slate-400">
          {new Date(note.createdOnUtc).toLocaleDateString()}
        </div>
      </div>

      {/* Body */}
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{note.noteBody}</p>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {note.sourceTypeCode === "ADMIN" && !note.isRead && (
          <button
            onClick={() => onMarkRead(note.noteId)}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            Mark Read
          </button>
        )}

        {note.requireAcknowledgement && !note.isAcknowledged && (
          <button
            onClick={() => onAcknowledge(note.noteId)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Acknowledge
          </button>
        )}

        {note.allowDismiss && !note.isDismissed && (
          <button
            onClick={() => onDismiss(note.noteId)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
