import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Activity,
} from "lucide-react";

export type HealthTone = "healthy" | "warning" | "disabled" | "misconfigured" | "degraded";

export const HEALTH_TONE_STYLES: Record<
  HealthTone,
  {
    label: string;
    Icon: typeof CheckCircle2;
    badgeClass: string;
    borderClass: string;
    textClass: string;
  }
> = {
  healthy: {
    label: "Healthy",
    Icon: CheckCircle2,
    badgeClass: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-300",
  },
  warning: {
    label: "Warning",
    Icon: AlertTriangle,
    badgeClass: "text-amber-300 bg-amber-500/10 border-amber-500/30",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-300",
  },
  disabled: {
    label: "Disabled",
    Icon: XCircle,
    badgeClass: "text-slate-400 bg-slate-700/40 border-slate-600",
    borderClass: "border-slate-700",
    textClass: "text-slate-400",
  },
  misconfigured: {
    label: "Misconfigured",
    Icon: AlertCircle,
    badgeClass: "text-red-300 bg-red-500/10 border-red-500/30",
    borderClass: "border-red-500/30",
    textClass: "text-red-300",
  },
  degraded: {
    label: "Degraded",
    Icon: Activity,
    badgeClass: "text-sky-300 bg-sky-500/10 border-sky-500/30",
    borderClass: "border-sky-500/30",
    textClass: "text-sky-300",
  },
};

export function timeAgo(date: string | Date | null | undefined) {
  if (!date) return "Never";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
}

export function isStaleByHours(date: string | Date | null | undefined, hours: number) {
  if (!date) return true;
  const diffMs = Date.now() - new Date(date).getTime();
  return diffMs >= hours * 60 * 60 * 1000;
}
