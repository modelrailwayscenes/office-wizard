export type SlaState = "within" | "at_risk" | "breached" | "none";

function parseMinutesFromText(value: string): number | null {
  const lower = value.toLowerCase().trim();
  const hrMatch = lower.match(/(\d+)\s*h(r|our|ours)?/);
  const minMatch = lower.match(/(\d+)\s*m(in|ins|inute|inutes)?/);
  const numMatch = lower.match(/^(\d+)$/);

  if (!hrMatch && !minMatch && !numMatch) return null;
  const hours = hrMatch ? Number(hrMatch[1]) : 0;
  const mins = minMatch ? Number(minMatch[1]) : 0;
  const flat = numMatch ? Number(numMatch[1]) : 0;
  return hours * 60 + mins + (numMatch ? flat : 0);
}

export function inferSlaState(timeRemaining?: string | null, deadlineDate?: string | null): SlaState {
  const remaining = (timeRemaining || "").toLowerCase();
  if (!remaining && !deadlineDate) return "none";

  if (
    remaining.includes("overdue") ||
    remaining.includes("breach") ||
    remaining.includes("late")
  ) {
    return "breached";
  }

  if (deadlineDate) {
    const dueMs = new Date(deadlineDate).getTime();
    if (!Number.isNaN(dueMs)) {
      const diffMin = Math.floor((dueMs - Date.now()) / 60000);
      if (diffMin < 0) return "breached";
      if (diffMin <= 60) return "at_risk";
    }
  }

  if (remaining.includes("risk")) return "at_risk";
  const parsed = parseMinutesFromText(remaining);
  if (parsed !== null && parsed <= 60) return "at_risk";
  return "within";
}

export function slaStateToBadge(state: SlaState): "connected" | "warning" | "error" | "disconnected" {
  if (state === "within") return "connected";
  if (state === "at_risk") return "warning";
  if (state === "breached") return "error";
  return "disconnected";
}
