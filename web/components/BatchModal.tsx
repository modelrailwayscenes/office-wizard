import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send, Archive, CheckSquare, Wand2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Minimal, paste-ready batch operations modal.
 * - Shows selected conversations
 * - Lets user choose a batch action (raw values preserved)
 * - Optional note field (for audit / batchOperation record)
 * - Requires explicit confirmation checkbox before running
 */

export type BatchActionType =
  | "send_tracking"
  | "process_refund"
  | "reply_with_draft"
  | "generate_drafts"
  | "mark_resolved"
  | "archive"
  | "assign_to_me";

export type BatchConversationItem = {
  id: string;
  subject?: string | null;
  primaryCustomerName?: string | null;
  primaryCustomerEmail?: string | null;
  currentPriorityBand?: string | null;
  currentCategory?: string | null;
  automationTag?: string | null;
  unreadCount?: number | null;
  hasDraft?: boolean | null;
};

export type BatchModalSubmitPayload = {
  action: BatchActionType;
  conversationIds: string[];
  note?: string;
  // Optional extras for future:
  // dryRun?: boolean;
  // params?: Record<string, any>;
};

export type BatchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Selected conversations to operate on */
  items: BatchConversationItem[];

  /** Called when user confirms "Run batch" */
  onSubmit: (payload: BatchModalSubmitPayload) => Promise<void> | void;

  /** Show loading state (e.g. while creating batchOperation / running action) */
  loading?: boolean;

  /** Optional: default action when modal opens */
  defaultAction?: BatchActionType;

  /** Optional: allow empty selection (normally false) */
  allowEmpty?: boolean;

  /** Optional: title override */
  title?: string;

  /** Optional: description override */
  description?: string;
};

type ActionOption = {
  value: BatchActionType;
  label: string;
  help: string;
  icon: React.ReactNode;
  danger?: boolean;
  requiresDrafts?: boolean;
};

const ACTION_OPTIONS: ActionOption[] = [
  {
    value: "send_tracking",
    label: "Send tracking",
    help: "Bulk-send tracking updates to selected customers.",
    icon: <Send className="h-4 w-4" />,
  },
  {
    value: "process_refund",
    label: "Process refund",
    help: "Bulk-mark refund requests as processed (and optionally notify).",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    value: "reply_with_draft",
    label: "Send existing drafts",
    help: "Send drafts that already exist for the selected conversations.",
    icon: <Mail className="h-4 w-4" />,
    requiresDrafts: true,
  },
  {
    value: "generate_drafts",
    label: "Generate drafts",
    help: "Generate draft replies for the selected conversations.",
    icon: <Wand2 className="h-4 w-4" />,
  },
  {
    value: "mark_resolved",
    label: "Mark resolved",
    help: "Mark conversations as resolved.",
    icon: <CheckSquare className="h-4 w-4" />,
  },
  {
    value: "archive",
    label: "Archive",
    help: "Move conversations to archive.",
    icon: <Archive className="h-4 w-4" />,
    danger: true,
  },
  {
    value: "assign_to_me",
    label: "Assign to me",
    help: "Assign selected conversations to the current user.",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
];

function pickActionLabel(value: string | undefined) {
  const found = ACTION_OPTIONS.find((o) => o.value === value);
  return found?.label ?? "Select an action";
}

export default function BatchModal({
  open,
  onOpenChange,
  items,
  onSubmit,
  loading = false,
  defaultAction = "send_tracking",
  allowEmpty = false,
  title = "Batch action",
  description = "Run an action across the selected conversations. This will be recorded as a batch operation.",
}: BatchModalProps) {
  const [action, setAction] = useState<BatchActionType>(defaultAction);
  const [note, setNote] = useState<string>("");
  const [confirm, setConfirm] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>("");

  // Reset modal state on open
  useEffect(() => {
    if (open) {
      setAction(defaultAction);
      setNote("");
      setConfirm(false);
      setLocalError(null);
      setFilterText("");
    }
  }, [open, defaultAction]);

  const conversationIds = useMemo(() => items.map((i) => i.id), [items]);

  const actionMeta = useMemo(() => ACTION_OPTIONS.find((o) => o.value === action), [action]);

  const draftEligibleCount = useMemo(
    () => items.filter((i) => !!i.hasDraft).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return items;

    return items.filter((i) => {
      const blob = [
        i.subject,
        i.primaryCustomerName,
        i.primaryCustomerEmail,
        i.currentPriorityBand,
        i.currentCategory,
        i.automationTag,
        i.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [items, filterText]);

  const selectionCount = items.length;

  const canRun = useMemo(() => {
    if (!allowEmpty && selectionCount === 0) return false;
    if (!confirm) return false;
    if (loading) return false;

    // If the action requires drafts, ensure at least one (or all) have drafts.
    if (actionMeta?.requiresDrafts) {
      // Safer default: require drafts for ALL selected, otherwise user thinks it sent but some won’t.
      return selectionCount > 0 && draftEligibleCount === selectionCount;
    }

    return true;
  }, [allowEmpty, selectionCount, confirm, loading, actionMeta, draftEligibleCount]);

  const handleRun = async () => {
    setLocalError(null);

    if (!allowEmpty && selectionCount === 0) {
      setLocalError("Select at least one conversation.");
      return;
    }

    if (actionMeta?.requiresDrafts && draftEligibleCount !== selectionCount) {
      setLocalError("This action requires drafts for all selected conversations.");
      return;
    }

    try {
      await onSubmit({
        action,
        conversationIds,
        note: note.trim() ? note.trim() : undefined,
      });
      onOpenChange(false);
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : "Batch action failed";
      setLocalError(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{title}</span>
            <Badge variant="outline" className="text-xs">
              {selectionCount} selected
            </Badge>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Action selector */}
          <div className="grid gap-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as BatchActionType)}>
              <SelectTrigger>
                <SelectValue placeholder={pickActionLabel(action)} />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      <span className="inline-flex">{opt.icon}</span>
                      <span className={cn(opt.danger && "text-red-500")}>{opt.label}</span>
                      {opt.requiresDrafts ? (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          Needs drafts
                        </Badge>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {actionMeta ? (
              <div className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="mt-0.5">{actionMeta.icon}</span>
                <span>{actionMeta.help}</span>
              </div>
            ) : null}

            {actionMeta?.requiresDrafts ? (
              <div className="rounded-md border p-3 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium">Draft requirement</div>
                  <div className="text-muted-foreground">
                    This action will only run if <b>all</b> selected conversations have drafts.
                  </div>
                  <div className="text-muted-foreground">
                    Drafts available:{" "}
                    <b>
                      {draftEligibleCount}/{selectionCount}
                    </b>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Selected list */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Selected conversations</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter selected…"
                  className="h-9 w-[260px]"
                />
              </div>
            </div>

            <div className="rounded-md border">
              <ScrollArea className="h-[240px]">
                <div className="p-2">
                  {selectionCount === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No conversations selected.</div>
                  ) : filteredItems.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground">No matches.</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredItems.map((row) => (
                        <div
                          key={row.id}
                          className="flex items-start justify-between gap-3 rounded-md border bg-background p-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {row.currentPriorityBand ? (
                                <Badge variant="outline" className="text-xs">
                                  {row.currentPriorityBand}
                                </Badge>
                              ) : null}
                              {row.unreadCount && row.unreadCount > 0 ? (
                                <Badge variant="outline" className="text-xs">
                                  Unread: {row.unreadCount}
                                </Badge>
                              ) : null}
                              {row.hasDraft ? (
                                <Badge variant="outline" className="text-xs">
                                  Draft
                                </Badge>
                              ) : null}
                            </div>

                            <div className="mt-1 truncate font-medium">
                              {row.subject || "(No subject)"}
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground truncate">
                              {(row.primaryCustomerName || "Unknown customer") +
                                (row.primaryCustomerEmail ? ` • ${row.primaryCustomerEmail}` : "")}
                            </div>

                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.currentCategory ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {row.currentCategory}
                                </Badge>
                              ) : null}
                              {row.automationTag ? (
                                <Badge variant="secondary" className="text-[10px]">
                                  {row.automationTag}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0 text-xs text-muted-foreground">
                            <span className="font-mono">{row.id}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Note */}
          <div className="grid gap-2">
            <Label>Batch note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context for this batch run (e.g., ‘Bulk tracking update after courier import’)"
              className="min-h-[90px]"
            />
          </div>

          {/* Confirmation */}
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox checked={confirm} onCheckedChange={(v) => setConfirm(Boolean(v))} />
            <div className="space-y-1">
              <div className="text-sm font-medium">Confirm batch action</div>
              <div className="text-xs text-muted-foreground">
                I understand this will run <b>{pickActionLabel(action)}</b> across{" "}
                <b>{selectionCount}</b> conversations.
              </div>
            </div>
          </div>

          {localError ? (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {localError}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleRun}
            disabled={!canRun}
            className={cn(actionMeta?.danger && "bg-red-600 hover:bg-red-600/90")}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              "Run batch"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}