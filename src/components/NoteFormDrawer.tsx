import { useEffect, useRef, useState } from "react";
import {
  X, Bell, Calendar, Loader2, Info, AlertCircle,
  CheckCircle2, Pin, MessageSquare, ShieldCheck
} from "lucide-react";
import { NoteForm } from "./NoteForm";
import { useLookups } from "../hooks/useLookups";
import { useMenus } from "../hooks/useMenus";
import { useAuthStore } from "../store/authStore";
import { useNotesStore } from "../store/notesStore";
import { appNotesApi } from "../api/appNotesApi";
import type { AppNoteDto, CreateAppNoteRequest } from "../models/appNoteModels";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDate(iso?: string | null) {
  if (!iso) return "Just now";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function priorityBar(code?: string) {
  switch (code?.toUpperCase()) {
    case "CRITICAL": return "bg-red-500";
    case "HIGH":     return "bg-amber-500";
    default:         return "bg-blue-500";
  }
}

function priorityBadge(code?: string) {
  switch (code?.toUpperCase()) {
    case "CRITICAL": return "bg-red-50 text-red-700 border-red-200";
    case "HIGH":     return "bg-amber-50 text-amber-700 border-amber-200";
    default:         return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USER view — highly readable list of admin instructions
// ─────────────────────────────────────────────────────────────────────────────
function UserNotificationsView({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState<AppNoteDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { decrement } = useNotesStore();

  // Fetch on open
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await appNotesApi.getVisible();
        if (!mounted) return;

        // 🌟 DEBUGGING: Check what the API actually returned 🌟
        console.log("Raw API Response:", response);

        // Safely extract the array. It handles cases where the API returns { data: [...] } 
        // or just [...] directly.
        const notesArray = Array.isArray(response) 
          ? response 
          : (response as any)?.data || (response as any)?.$values || [];

        console.log("Extracted Notes Array:", notesArray);

        // Only show notes from admin
        const adminNotes = notesArray
          .filter((n: any) => {
            const type = (n.sourceTypeCode ?? n.SourceTypeCode ?? "").toUpperCase();
            // Checking both common DB values just in case
            return type === "ADMIN" || type === "INSTRUCTION"; 
          })
          .sort((a: any, b: any) =>
            new Date(b.createdOnUtc || b.startDateUtc || 0).getTime() -
            new Date(a.createdOnUtc || a.startDateUtc || 0).getTime()
          );
          
        setNotes(adminNotes);
      } catch (err) {
        console.error("Fetch error:", err);
        if (mounted) setError("Failed to load notifications. Please try again.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [isOpen]);

  // Mark a single note as read
  const markRead = async (noteId: number) => {
    const note = notes.find(n => n.noteId === noteId);
    if (!note || note.isRead) return;
    
    // Optimistic update
    setNotes(prev => prev.map(n => n.noteId === noteId ? { ...n, isRead: true } : n));
    decrement();
    
    try {
      await appNotesApi.markRead(noteId);
    } catch {
      // Revert if it failed
      setNotes(prev => prev.map(n => n.noteId === noteId ? { ...n, isRead: false } : n));
    }
  };

  // Mark all unread as read
  const markAllRead = async () => {
    const unread = notes.filter(n => !n.isRead);
    if (unread.length === 0) return;
    
    setNotes(prev => prev.map(n => ({ ...n, isRead: true })));
    for (const note of unread) {
      try { await appNotesApi.markRead(note.noteId); } catch { /* best-effort */ }
    }
  };

  const unreadCount = notes.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
            <Bell size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-tight">Instructions</h2>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              {unreadCount > 0 ? (
                <span className="text-blue-600 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span> {unreadCount} New</span>
              ) : "All caught up"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors border border-blue-100 shadow-sm"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Body List */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Syncing Instructions...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-48 text-center bg-red-50 rounded-2xl border border-red-100 p-6">
            <AlertCircle size={32} className="text-red-400 mb-3" />
            <p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-10">
            <div className="w-20 h-20 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-5 shadow-sm">
              <ShieldCheck size={32} className="text-slate-300" />
            </div>
            <h3 className="text-base font-black text-slate-700 mb-2">No Instructions Yet</h3>
            <p className="text-sm font-medium text-slate-400 max-w-[260px] leading-relaxed">
              When administration posts instructions or policies for you, they will appear here.
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.noteId}
              className={`relative rounded-2xl border p-6 shadow-sm transition-all overflow-hidden ${
                !note.isRead
                  ? "bg-white border-blue-200 ring-4 ring-blue-50"
                  : "bg-white border-slate-200 opacity-80 hover:opacity-100"
              }`}
            >
              {/* Left Priority Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${priorityBar(note.priorityCode)}`} />

              {/* Note Header */}
              <div className="flex items-start justify-between gap-4 mb-4 pl-2">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      <ShieldCheck size={12} className="text-slate-400" />
                      From: Administration
                    </span>
                    {!note.isRead && (
                      <span className="bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">New</span>
                    )}
                  </div>
                  <h3 className="font-black text-slate-800 text-base leading-snug">
                    {note.title}
                  </h3>
                </div>
                
                {/* Badges */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${priorityBadge(note.priorityCode)}`}>
                    {note.priorityCode || "NORMAL"}
                  </span>
                  {note.requireAcknowledgement && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-purple-50 text-purple-700 border-purple-200">
                      <CheckCircle2 size={10} /> Requires Ack
                    </span>
                  )}
                </div>
              </div>

              {/* Distinct Reading Box for the Message Body */}
              <div className="ml-2 bg-slate-50/80 rounded-xl p-5 border border-slate-100/80 mb-4 shadow-inner">
                <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {note.noteBody}
                </p>
              </div>

              {/* Footer Meta & Actions */}
              <div className="mt-2 flex items-center justify-between pl-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                    <Calendar size={13} />
                    Posted: {formatDate((note as any).createdOnUtc || (note as any).startDateUtc)}
                  </div>
                  {note.isPinned && (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                      <Pin size={11} className="fill-slate-300" /> Pinned to top
                    </span>
                  )}
                </div>

                {/* Explicit Read/Acknowledge Action */}
                {!note.isRead ? (
                  <button 
                    onClick={() => markRead(note.noteId)}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl border border-blue-200 transition-colors shadow-sm"
                  >
                    <CheckCircle2 size={16} />
                    {note.requireAcknowledgement ? "Acknowledge" : "Mark as Read"}
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 size={16} /> Read
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN view — create / send a new note
// ─────────────────────────────────────────────────────────────────────────────
function AdminNoteFormView({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { getByType, getDefault } = useLookups();
  const { menus } = useMenus();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) { setSuccess(false); setSubmitError(null); }
  }, [isOpen]);

  const handleSubmit = async (request: CreateAppNoteRequest) => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      await appNotesApi.create(request);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch {
      setSubmitError("Failed to save note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
            <Bell size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-tight">New Instruction</h2>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
              Admin Broadcast
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        {success ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <p className="text-base font-black text-slate-800">Instruction sent successfully!</p>
          </div>
        ) : (
          <>
            {submitError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-center gap-3 shadow-sm">
                <AlertCircle size={18} className="text-red-500 shrink-0" />
                {submitError}
              </div>
            )}
            <NoteForm
              sourceTypeCode="ADMIN"
              menus={menus}
              getLookup={getByType}
              getDefault={getDefault}
              onCancel={onClose}
              onSubmit={handleSubmit}
            />
            {submitting && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
                <Loader2 size={16} className="animate-spin" /> Saving Instruction...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart wrapper — renders admin form or user read-only view based on role
// ─────────────────────────────────────────────────────────────────────────────
export default function NoteFormDrawer({ isOpen, onClose }: Props) {
  const { userRoles } = useAuthStore();
  const drawerRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRoles.some((r) =>
    ["admin", "superadmin", "super admin", "ceo", "dutyceo"].includes(r.toLowerCase())
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={isAdmin ? "New Instruction" : "Notifications"}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-xl bg-slate-50 shadow-[0_0_40px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isAdmin ? (
          <AdminNoteFormView isOpen={isOpen} onClose={onClose} />
        ) : (
          <UserNotificationsView isOpen={isOpen} onClose={onClose} />
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}} />
    </>
  );
}