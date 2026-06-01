import type { AppNoteDto } from "../../models/appNoteModels";
import { NoteCard } from "../../components/NoteCard";

interface Props {
  notes: AppNoteDto[];
  getText: (lookupTypeCode: string, valueCode?: string | null) => string;
  onMarkRead: (noteId: number) => void;
  onAcknowledge: (noteId: number) => void;
  onDismiss: (noteId: number) => void;
}

export function MyNotesPanel(props: Props) {
  const myNotes = props.notes.filter(x => x.sourceTypeCode === "USER");

  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="border-b p-4">
        <div className="font-extrabold text-slate-900">My Notes / My History</div>
        <div className="text-xs text-slate-500">
          User notes can be general, menu-specific, or record-specific.
        </div>
      </div>
      <div className="flex max-h-[560px] flex-col gap-3 overflow-auto p-4">
        {myNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
            No personal notes for this context.
          </div>
        ) : (
          myNotes.map(note => (
            <NoteCard key={note.noteId} note={note} {...props} />
          ))
        )}
      </div>
    </div>
  );
}
