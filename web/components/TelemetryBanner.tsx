import { X } from "lucide-react";

export interface PageTelemetry {
  lastAction: string;
  details?: string;
  at: string;
  severity?: "info" | "success" | "warning" | "error";
  durationMs?: number;
}

const severityStyles: Record<NonNullable<PageTelemetry["severity"]>, string> = {
  info: "border-slate-700 bg-slate-900/60 text-slate-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  error: "border-red-500/30 bg-red-500/10 text-red-100",
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
            <div className="text-xs text-slate-300 mt-1">{telemetry.details}</div>
          )}
          <div className="text-[11px] text-slate-400 mt-1">
            {formatTelemetryTime(telemetry.at)}
            {durationLabel}
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Dismiss telemetry banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
