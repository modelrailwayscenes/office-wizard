import { useFindMany } from "@gadgetinc/react";
import { api } from "../api";
import { Activity, Clock, User } from "lucide-react";

type TriageStatus = {
  performedAt?: string | Date | null;
  performedBy?: string | null;
  processed?: number;
  skipped?: number;
  errors?: number;
};

const formatTimestamp = (date?: string | Date | null) => {
  if (!date) return "Never";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString();
};

export function StatusBar({ className = "" }: { className?: string }) {
  const [{ data: logs, fetching }] = useFindMany(api.actionLog, {
    first: 20,
    sort: { performedAt: "Descending" } as any,
    filter: { action: { equals: "bulk_action" } } as any,
    select: {
      performedAt: true,
      performedBy: true,
      actionDescription: true,
      metadata: true,
      bulkActionCount: true,
    } as any,
  });

  const triageLog = (logs || []).find((log: any) => {
    const kind = log?.metadata?.kind;
    const desc = (log?.actionDescription || "").toLowerCase();
    return kind === "triage_run" || desc.includes("triage");
  }) as any;

  const triageStatus: TriageStatus = triageLog
    ? {
        performedAt: triageLog.performedAt,
        performedBy: triageLog.performedBy,
        processed:
          triageLog?.metadata?.processed ??
          triageLog?.bulkActionCount ??
          0,
        skipped: triageLog?.metadata?.skipped ?? 0,
        errors: triageLog?.metadata?.errors ?? 0,
      }
    : {};

  const statusLabel = triageLog
    ? `Processed ${triageStatus.processed ?? 0}, skipped ${triageStatus.skipped ?? 0}, errors ${triageStatus.errors ?? 0}`
    : "No triage runs recorded yet";

  return (
    <div className={`px-8 pt-4 ${className}`}>
      <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-medium">Last triage run</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{fetching ? "Loading..." : formatTimestamp(triageStatus.performedAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{triageStatus.performedBy || "system"}</span>
          </div>
          <div className="text-muted-foreground">{statusLabel}</div>
        </div>
      </div>
    </div>
  );
}
