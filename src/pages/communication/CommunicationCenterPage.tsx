import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Search, X, RefreshCw } from "lucide-react";
import { appNotesApi } from "../../api/appNotesApi";
import { useLookups } from "../../hooks/useLookups";
import { useMenus } from "../../hooks/useMenus";
import { useToast } from "../../hooks/useToast";
import { useAuthStore } from "../../store/authStore";
import { useNotesStore } from "../../store/notesStore";
import type { AppNoteDto, CreateAppNoteRequest } from "../../models/appNoteModels";
import { NoteForm } from "./NoteForm";
import { MenuRecordContextPanel } from "./MenuRecordContextPanel";
import { AppModal } from "../../components/AppModal";
import { AppToast } from "../../components/AppToast";

function toArr<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["$values", "data", "items"]) if (Array.isArray(o[k])) return o[k] as T[];
  }
  return [];
}

export default function CommunicationCenterPage() {
  const { userRoles, userEmail, userName } = useAuthStore();
  const { setUnreadCount } = useNotesStore();
  const isAdmin = userRoles.some(r =>
    ["admin", "superadmin", "super admin", "ceo", "dutyceo"].includes(r.toLowerCase())
  );

  // Current user identity — used as client-side privacy guard for USER notes
  // The REAL filter is on backend (CreatedBy = current user ID).
  // This is a display-level safety net only.
  const currentIdentity = userName || userEmail || "";

  const { menus, loading: menusLoading } = useMenus();
  const { getByType, getText, getDefault, loading: lookupLoading, error: lookupError } = useLookups();
  const { message, showToast } = useToast();

  const [notes, setNotes]                         = useState<AppNoteDto[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [currentMenuCode, setCurrentMenuCode]     = useState<string | null>(null);
  const [currentEntityType, setCurrentEntityType] = useState<string | null>(null);
  const [currentEntityId, setCurrentEntityId]     = useState<string | null>(null);
  const [modalOpen, setModalOpen]                 = useState(false);
  const [modalSource, setModalSource]             = useState<"ADMIN" | "USER">("ADMIN");

  // Filters
  const [adminSearch, setAdminSearch]   = useState("");
  const [adminTypeF, setAdminTypeF]     = useState("");
  const [adminPriF, setAdminPriF]       = useState("");
  const [userSearch, setUserSearch]     = useState("");
  const [userTypeF, setUserTypeF]       = useState("");
  const [userPriF, setUserPriF]         = useState("");

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await appNotesApi.getVisible(
        currentMenuCode || undefined,
        currentEntityType || undefined,
        currentEntityId || undefined
      );
      const arr = toArr<AppNoteDto>(data);
      setNotes(arr);
      // Sync unread count to navbar bell
      setUnreadCount(arr.filter(n => n.sourceTypeCode === "ADMIN" && !n.isRead).length);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to load notes.");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [currentMenuCode, currentEntityType, currentEntityId, setUnreadCount]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const createNote = async (request: CreateAppNoteRequest) => {
    try {
      await appNotesApi.create(request);
      setModalOpen(false);
      showToast("Note saved successfully.");
      await loadNotes();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save note.");
    }
  };

  const handleMarkRead = async (id: number) => {
    try { await appNotesApi.markRead(id); await loadNotes(); showToast("Marked as read."); }
    catch { showToast("Failed."); }
  };
  const handleAcknowledge = async (id: number) => {
    try { await appNotesApi.acknowledge(id); await loadNotes(); showToast("Acknowledged."); }
    catch { showToast("Failed."); }
  };
  const handleDismiss = async (id: number) => {
    try { await appNotesApi.dismiss(id); await loadNotes(); showToast("Dismissed."); }
    catch { showToast("Failed."); }
  };

  const filterNotes = (src: "ADMIN" | "USER", search: string, typeF: string, priF: string) =>
    notes
      .filter(n => n.sourceTypeCode === src)
      // ── PRIVACY GUARD ────────────────────────────────────────────────────
      // USER notes: only show notes created by the current logged-in user.
      // Backend is the authoritative filter (CreatedBy = currentUserId).
      // This client-side check is a safety net for cases where the backend
      // returns extra rows (e.g. during development / before backend is fixed).
      // It matches on createdBy field which should equal the user's loginId/email.
      .filter(n => {
        if (src !== "USER") return true;
        if (!n.createdBy) return true; // backend didn't send createdBy — trust backend
        const cb = n.createdBy.toLowerCase();
        const id = currentIdentity.toLowerCase();
        return !id || cb === id || cb.includes(id) || id.includes(cb);
      })
      .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.noteBody.toLowerCase().includes(search.toLowerCase()))
      .filter(n => !typeF || n.noteTypeCode === typeF)
      .filter(n => !priF || n.priorityCode === priF);

  const adminNotes  = filterNotes("ADMIN", adminSearch, adminTypeF, adminPriF);
  const userNotes   = filterNotes("USER",  userSearch,  userTypeF,  userPriF);
  const unreadCount = notes.filter(n => n.sourceTypeCode === "ADMIN" && !n.isRead).length;
  const pendingAck  = notes.filter(n => n.requireAcknowledgement && !n.isAcknowledged && !n.isDismissed).length;

  if (lookupLoading || menusLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <Loader2 size={40} className="mx-auto animate-spin text-blue-500" />
          <div className="mt-4 text-lg font-bold text-slate-700">Loading configuration…</div>
          <div className="mt-1 text-sm text-slate-400">Fetching lookups and menus from server</div>
        </div>
      </div>
    );
  }

  if (lookupError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">⚠️</div>
          <div className="mt-3 text-lg font-bold text-red-700">Configuration Error</div>
          <div className="mt-1 text-sm text-slate-500">{lookupError}</div>
          <button onClick={() => window.location.reload()}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-100">
      <div className="p-5 space-y-5">

        {/* ── Page Title Row ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-white to-blue-50 px-5 py-4 shadow-sm">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Communication Center</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              General shows everywhere · Menu notes show only on selected menu · Record notes show only on selected record
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadNotes} disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button onClick={() => { setModalSource("USER"); setModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">
              <Plus size={14} /> My Note
            </button>
            {isAdmin && (
              <button onClick={() => { setModalSource("ADMIN"); setModalOpen(true); }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700">
                <Plus size={14} /> Admin Instruction
              </button>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Unread Admin",  value: unreadCount,                                           color: "text-red-600"    },
            { label: "Admin Items",   value: notes.filter(n => n.sourceTypeCode === "ADMIN").length, color: "text-blue-600"   },
            { label: "My Notes",      value: notes.filter(n => n.sourceTypeCode === "USER").length,  color: "text-purple-600" },
            { label: "Pending Ack",   value: pendingAck,                                            color: "text-amber-600"  },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
              <div className={`text-3xl font-extrabold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Context Panel ── */}
        <MenuRecordContextPanel
          notes={notes}
          menus={menus}
          currentMenuCode={currentMenuCode}
          currentEntityType={currentEntityType}
          currentEntityId={currentEntityId}
          onMenuChange={setCurrentMenuCode}
          onRecordChange={(type, id) => { setCurrentEntityType(type); setCurrentEntityId(id); }}
        />

        {/* ── Notes Grid ── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* ── Admin Notes Panel ── */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-3.5">
                <div>
                  <div className="font-extrabold text-slate-900">Admin Instructions / Announcements</div>
                  <div className="text-xs text-slate-500">Published by admin, manager, or system owner</div>
                </div>
                {isAdmin && (
                  <button onClick={() => { setModalSource("ADMIN"); setModalOpen(true); }}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">
                    <Plus size={12} /> Admin
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-3 py-2.5">
                <div className="relative flex-1 min-w-[140px]">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={adminSearch} onChange={e => setAdminSearch(e.target.value)}
                    placeholder="Search admin notes…"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none" />
                  {adminSearch && <button onClick={() => setAdminSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={10} /></button>}
                </div>
                <select value={adminTypeF} onChange={e => setAdminTypeF(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none">
                  <option value="">All Types</option>
                  {getByType("NOTE_TYPE").map(x => <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>)}
                </select>
                <select value={adminPriF} onChange={e => setAdminPriF(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none">
                  <option value="">All Priority</option>
                  {getByType("PRIORITY").map(x => <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>)}
                </select>
              </div>

              <div className="flex max-h-[520px] flex-col gap-3 overflow-auto p-4">
                {adminNotes.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                    No admin instructions for this context.
                  </div>
                ) : adminNotes.map(note => (
                  <NoteRow key={note.noteId} note={note} getText={getText}
                    onMarkRead={handleMarkRead} onAcknowledge={handleAcknowledge} onDismiss={handleDismiss} />
                ))}
              </div>
            </div>

            {/* ── My Notes Panel ── */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-3.5">
                <div>
                  <div className="font-extrabold text-slate-900">My Notes / My History</div>
                  <div className="text-xs text-slate-500">Personal notes created by current user</div>
                </div>
                <button onClick={() => { setModalSource("USER"); setModalOpen(true); }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Plus size={12} /> My Note
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 border-b bg-slate-50 px-3 py-2.5">
                <div className="relative flex-1 min-w-[140px]">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search my notes…"
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-xs font-semibold text-slate-700 focus:border-blue-400 focus:outline-none" />
                  {userSearch && <button onClick={() => setUserSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={10} /></button>}
                </div>
                <select value={userTypeF} onChange={e => setUserTypeF(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none">
                  <option value="">All Types</option>
                  {getByType("NOTE_TYPE").map(x => <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>)}
                </select>
                <select value={userPriF} onChange={e => setUserPriF(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 focus:outline-none">
                  <option value="">All Priority</option>
                  {getByType("PRIORITY").map(x => <option key={x.valueCode} value={x.valueCode}>{x.displayText}</option>)}
                </select>
              </div>

              <div className="flex max-h-[520px] flex-col gap-3 overflow-auto p-4">
                {userNotes.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                    No personal notes for this context.
                  </div>
                ) : userNotes.map(note => (
                  <NoteRow key={note.noteId} note={note} getText={getText}
                    onMarkRead={handleMarkRead} onAcknowledge={handleAcknowledge} onDismiss={handleDismiss} />
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <AppModal
        title={modalSource === "ADMIN" ? "Create Admin Instruction / Announcement" : "Add My Note / History"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <NoteForm
          sourceTypeCode={modalSource}
          menus={menus}
          getLookup={getByType}
          getDefault={getDefault}
          currentMenuCode={currentMenuCode}
          currentEntityType={currentEntityType}
          currentEntityId={currentEntityId}
          onCancel={() => setModalOpen(false)}
          onSubmit={createNote}
        />
      </AppModal>

      <AppToast message={message} />
    </div>
  );
}

// ── Inline NoteRow component ──────────────────────────────────────────────
function NoteRow({ note, getText, onMarkRead, onAcknowledge, onDismiss }: {
  note: AppNoteDto;
  getText: (type: string, code?: string | null) => string;
  onMarkRead: (id: number) => void;
  onAcknowledge: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const p = (note.priorityCode || "NORMAL").toUpperCase();
  const leftColor =
    p === "CRITICAL" ? "border-l-red-600" :
    p === "HIGH"     ? "border-l-amber-500" :
    p === "LOW"      ? "border-l-slate-400" : "border-l-blue-500";
  const isUnread = note.sourceTypeCode === "ADMIN" && !note.isRead;

  return (
    <div className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${leftColor} ${isUnread ? "ring-1 ring-blue-100" : ""}`}>
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
          note.sourceTypeCode === "ADMIN"
            ? "bg-blue-100 text-blue-700 border-blue-200"
            : "bg-purple-100 text-purple-700 border-purple-200"
        }`}>{getText("SOURCE_TYPE", note.sourceTypeCode) || note.sourceTypeCode}</span>

        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {getText("NOTE_TYPE", note.noteTypeCode) || note.noteTypeCode}
        </span>

        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
          p === "CRITICAL" ? "bg-red-100 text-red-700 border-red-200" :
          p === "HIGH"     ? "bg-amber-100 text-amber-700 border-amber-200" :
          "bg-slate-100 text-slate-600 border-slate-200"
        }`}>{getText("PRIORITY", note.priorityCode) || note.priorityCode}</span>

        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
          {getText("VISIBILITY_TYPE", note.visibilityTypeCode) || note.visibilityTypeCode}
        </span>

        {note.menuCode && (
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
            Menu: {note.menuCode}
          </span>
        )}
        {note.entityType && note.entityId && (
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">
            {note.entityType} #{note.entityId}
          </span>
        )}
        {note.requireAcknowledgement && !note.isAcknowledged && (
          <span className="rounded-full border border-orange-200 bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">ACK REQUIRED</span>
        )}
        {note.sourceTypeCode === "ADMIN" && (
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
            note.isRead ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
          }`}>{note.isRead ? "✓ Read" : "Unread"}</span>
        )}
        {note.isAcknowledged && (
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">✓ Acknowledged</span>
        )}
        {note.isPinned && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">📌 Pinned</span>
        )}
      </div>

      {/* Title + date */}
      <div className="flex items-start justify-between gap-2">
        <div className={`text-sm font-extrabold ${isUnread ? "text-slate-900" : "text-slate-800"}`}>{note.title}</div>
        <span className="shrink-0 text-[10px] text-slate-400">{new Date(note.createdOnUtc).toLocaleDateString()}</span>
      </div>

      {/* Body */}
      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{note.noteBody}</p>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {note.sourceTypeCode === "ADMIN" && !note.isRead && (
          <button onClick={() => onMarkRead(note.noteId)}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
            Mark Read
          </button>
        )}
        {note.requireAcknowledgement && !note.isAcknowledged && (
          <button onClick={() => onAcknowledge(note.noteId)}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-colors">
            Acknowledge
          </button>
        )}
        {note.allowDismiss && !note.isDismissed && (
          <button onClick={() => onDismiss(note.noteId)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors">
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
