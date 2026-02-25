import {
  Activity,
  AlertTriangle,
  Layers,
  PenLine,
  StickyNote,
} from "lucide-react";

export type AiCommentKind =
  | "triage_run"
  | "draft_generated"
  | "batch_action"
  | "error"
  | "note";

const KIND_ALIASES: Record<string, AiCommentKind> = {
  triage_run: "triage_run",
  triage_rationale: "triage_run",
  draft_generated: "draft_generated",
  draft_regenerated: "draft_generated",
  batch_action: "batch_action",
  batch_result: "batch_action",
  error: "error",
  note: "note",
};

export const AI_COMMENT_KIND_STYLES: Record<
  AiCommentKind,
  {
    label: string;
    className: string;
    Icon: typeof Activity;
  }
> = {
  triage_run: {
    label: "Triage",
    className: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
    Icon: Activity,
  },
  draft_generated: {
    label: "Draft",
    className: "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
    Icon: PenLine,
  },
  batch_action: {
    label: "Batch",
    className: "text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30",
    Icon: Layers,
  },
  error: {
    label: "Error",
    className: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30",
    Icon: AlertTriangle,
  },
  note: {
    label: "Note",
    className: "text-muted-foreground bg-muted/60 border-border",
    Icon: StickyNote,
  },
};

export function normalizeAiCommentKind(kind?: string | null): AiCommentKind {
  if (!kind) return "note";
  const normalized = kind.toLowerCase();
  return KIND_ALIASES[normalized] ?? "note";
}

export function getAiCommentStyle(kind?: string | null) {
  const normalized = normalizeAiCommentKind(kind);
  return {
    kind: normalized,
    ...AI_COMMENT_KIND_STYLES[normalized],
  };
}
