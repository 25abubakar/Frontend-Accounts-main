import { useState } from "react";
import type { AppNoteDto } from "../models/appNoteModels";

interface Props {
  notes: AppNoteDto[];
  onMarkRead: (noteId: number) => void;
}

export function NotificationBell({ notes, onMarkRead }: Props) {
  const [open, setOpen] = useState(false);
  const unread = notes.filter((x) => x.sourceTypeCode === "ADMIN" && !x.isRead);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative h-10 w-11 rounded-xl bg-white/20 text-lg text-white"
      >
        🔔
        {unread.length > 0 && (
          <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-xs font-bold">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-30 w-96 overflow-hidden rounded-2xl border bg-white shadow-xl">
          <div className="flex justify-between border-b px-4 py-3 font-bold">
            <span>Unread Admin Items</span>
            <span>{unread.length}</span>
          </div>
          <div className="max-h-96 overflow-auto">
            {unread.length === 0 ? (
              <div className="p-5 text-center text-sm text-slate-500">No unread admin items.</div>
            ) : (
              unread.map((note) => (
                <button
                  key={note.noteId}
                  onClick={() => onMarkRead(note.noteId)}
                  className="block w-full border-b px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div className="text-sm font-bold text-slate-900">{note.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{note.noteTypeCode} · {note.priorityCode}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
