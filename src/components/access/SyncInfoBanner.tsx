/**
 * src/components/access/SyncInfoBanner.tsx
 *
 * Shows the auto-sync info alert and a manual "Sync to Matrix" button.
 * Used inside GroupPanel (side drawer) for each group.
 */
import { Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { accessApi } from "../../api/accessApi";

interface SyncInfoBannerProps {
  groupId: number;
  onSynced?: () => void; // called after a successful sync so parent can refresh
}

export default function SyncInfoBanner({ groupId, onSynced }: SyncInfoBannerProps) {
  const [syncing, setSyncing]   = useState(false);
  const [msg, setMsg]           = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setMsg(null);
      const result = await accessApi.syncGroupToMatrix(groupId);
      setMsg({
        type: "success",
        text: `${result.message ?? "Sync complete."} · ${result.staffSynced ?? 0} staff · ${result.permissionsSynced ?? 0} permissions`,
      });
      onSynced?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setMsg({
        type: "error",
        text: err.response?.data?.message ?? "Sync failed. Please try again.",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 space-y-2">
      {/* Info header */}
      <div className="flex items-start gap-2">
        <span className="text-base leading-none">ℹ️</span>
        <div>
          <p className="text-xs font-bold text-blue-700">Auto-Sync Enabled</p>
          <p className="text-[10px] text-blue-600 mt-0.5">
            When you save group features, they are automatically synced to the department
            matrix for all staff in this group.
          </p>
        </div>
      </div>

      {/* Result message */}
      {msg && (
        <div
          className={`rounded-xl px-3 py-2 text-[11px] font-semibold ${
            msg.type === "success"
              ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
              : "bg-red-50 border border-red-100 text-red-600"
          }`}
        >
          {msg.type === "success" ? "✅ " : "❌ "}
          {msg.text}
        </div>
      )}

      {/* Manual sync button */}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
      >
        {syncing ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <RotateCcw size={12} />
        )}
        {syncing ? "Syncing to Matrix…" : "🔄 Manual Sync to Matrix"}
      </button>
    </div>
  );
}
