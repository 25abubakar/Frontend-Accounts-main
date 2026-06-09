import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { appNotesApi } from '../../api/appNotesApi';
import type { AppNoteDto } from '../../types/api';

interface Props {
  notes: AppNoteDto[];
  onDismissAll?: () => void;
}

export default function LoginInstructionPopups({ notes, onDismissAll }: Props) {
  const popups = notes.filter(n => n.isPopup && !n.isDismissed);
  const [queue, setQueue] = useState(popups);
  const [busy, setBusy] = useState(false);

  if (queue.length === 0) return null;

  const current = queue[0];

  const closeCurrent = async (action: 'dismiss' | 'acknowledge') => {
    if (!current || busy) return;
    try {
      setBusy(true);
      if (action === 'acknowledge' && current.requireAcknowledgement) {
        await appNotesApi.acknowledge(current.noteId);
      } else if (current.allowDismiss) {
        await appNotesApi.dismiss(current.noteId);
      } else {
        await appNotesApi.markRead(current.noteId);
      }
    } catch {
      /* still advance queue */
    } finally {
      setBusy(false);
      const next = queue.slice(1);
      setQueue(next);
      if (next.length === 0) onDismissAll?.();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={current.noteId}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-lg font-black text-slate-800">{current.title}</h3>
            {current.allowDismiss && (
              <button
                onClick={() => closeCurrent('dismiss')}
                disabled={busy}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div
            className="px-5 py-4 text-sm text-slate-600 leading-relaxed max-h-[50vh] overflow-y-auto prose prose-sm"
            dangerouslySetInnerHTML={{ __html: current.noteBody }}
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 bg-slate-50">
            {current.requireAcknowledgement ? (
              <button
                onClick={() => closeCurrent('acknowledge')}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> I understand
              </button>
            ) : (
              <button
                onClick={() => closeCurrent('dismiss')}
                disabled={busy}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Close
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
