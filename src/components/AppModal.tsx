import type { ReactNode } from "react";

interface Props {
  title: string;
  open: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export function AppModal({ title, open, children, footer, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-blue-900 to-blue-600 px-5 py-4 text-white">
          <div className="font-extrabold">{title}</div>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-xl">
            ×
          </button>
        </div>
        <div className="max-h-[72vh] overflow-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t bg-slate-50 p-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
