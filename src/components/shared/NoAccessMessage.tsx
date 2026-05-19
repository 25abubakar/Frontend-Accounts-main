/**
 * NoAccessMessage - Display when user has no permission to view data
 */
import { ShieldOff } from "lucide-react";

interface NoAccessMessageProps {
  title?: string;
  message?: string;
}

export default function NoAccessMessage({
  title = "Access Restricted",
  message = "You don't have permission to view this content. Contact your administrator for access.",
}: NoAccessMessageProps) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <ShieldOff size={32} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
