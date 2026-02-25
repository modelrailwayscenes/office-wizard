import { X } from "lucide-react";

export interface PageTelemetry {
  lastAction: string;
  details?: string;
  at: string;
  severity?: "info" | "success" | "warning" | "error";
  durationMs?: number;
}

const severityStyles: Record<NonNullable<PageTelemetry["severity"]>, string> = {
  info: "border-border bg-card/70 text-foreground",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200",
};

function formatTelemetryTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TelemetryBanner({
  telemetry,
  onDismiss,
}: {
  telemetry: PageTelemetry | null;
  onDismiss: () => void;
}) {
  if (!telemetry) return null;

  const severity = telemetry.severity ?? "info";
  const durationLabel =
    typeof telemetry.durationMs === "number" ? ` · ${telemetry.durationMs}ms` : "";

  return (
    <div className={`border rounded-lg px-4 py-3 ${severityStyles[severity]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{telemetry.lastAction}</div>
          {telemetry.details && (
            <div className="text-xs text-muted-foreground mt-1">{telemetry.details}</div>
          )}
          <div className="text-[11px] text-muted-foreground mt-1">
            {formatTelemetryTime(telemetry.at)}
            {durationLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss telemetry banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
