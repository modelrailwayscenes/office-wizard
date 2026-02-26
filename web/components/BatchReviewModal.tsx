// web/components/BatchReviewModal.tsx

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { X, RefreshCw, Send, Save, Check, Archive, UserPlus, FolderInput, Ban } from "lucide-react";

interface BatchEmail {
  id: string; // emailMessage id
  conversationId: string;
  customerName: string;
  customerEmail: string;
  orderId?: string;
  priority: "P1" | "P2" | "P3" | "P4";
  receivedAt: string;
  originalSubject: string;
  originalBody: string;
  aiResponse: string;
  hasDraft: boolean;
  status: "pending" | "sending" | "sent" | "error";
}

interface BatchOpportunity {
  id: string;
  type: string;
  label: string;
  emails: BatchEmail[];
  aiSuggestion: string;
  estimatedTimeSaved: number;
}

export interface BatchReviewModalProps {
  batch: BatchOpportunity;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;

  assignToUserId?: string;
  onAssignToUserIdChange?: (v: string) => void;

  moveToCategory?: string;
  onMoveToCategoryChange?: (v: string) => void;

  onSendAll: (emailIds: string[], batchId: string, draftsByEmailId: Record<string, string>) => Promise<void>;
  onSaveDrafts: (emailIds: string[], batchId: string, draftsByEmailId: Record<string, string>) => Promise<void>;
  onResolveAll?: (emailIds: string[], batchId: string) => Promise<void>;
  onArchiveAll?: (emailIds: string[], batchId: string) => Promise<void>;
  onRejectAll?: (emailIds: string[], batchId: string) => Promise<void>;
  onAssignAll?: (emailIds: string[], batchId: string, assignToUserId?: string) => Promise<void>;
  onMoveAll?: (emailIds: string[], batchId: string, moveToCategory?: string) => Promise<void>;

  onRegenerateResponse: (emailId: string) => Promise<string>;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function BatchReviewModal(props: BatchReviewModalProps) {
  const {
    batch,
    isOpen,
    onClose,
    loading,
    assignToUserId,
    onAssignToUserIdChange,
    moveToCategory,
    onMoveToCategoryChange,
    onSendAll,
    onSaveDrafts,
    onResolveAll,
    onArchiveAll,
    onRejectAll,
    onAssignAll,
    onMoveAll,
    onRegenerateResponse,
  } = props;

  const emails = batch?.emails || [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [openEmailId, setOpenEmailId] = useState<string | null>(null);
  const [safeModeEnabled, setSafeModeEnabled] = useState(true);
  const [ackReadyToSend, setAckReadyToSend] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const all = emails.map((e) => e.id);
    setSelectedIds(all);
    setDraftEdits(Object.fromEntries(emails.map((e) => [e.id, e.aiResponse || ""])) as Record<string, string>);
    setOpenEmailId(all[0] || null);
    setSafeModeEnabled(true);
    setAckReadyToSend(false);
  }, [isOpen, batch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const allIds = useMemo(() => emails.map((e) => e.id), [emails]);
  const selectedCount = selectedIds.length;

  const toggleAll = (checked: boolean) => setSelectedIds(checked ? allIds : []);
  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  };

  const selectedDraftsMap = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of selectedIds) out[id] = draftEdits[id] ?? "";
    return out;
  }, [selectedIds, draftEdits]);
  const selectedMissingDraftCount = useMemo(
    () => selectedIds.filter((id) => !(selectedDraftsMap[id] || "").trim()).length,
    [selectedDraftsMap, selectedIds]
  );
  const canSend =
    !loading &&
    selectedIds.length > 0 &&
    (!safeModeEnabled || (ackReadyToSend && selectedMissingDraftCount === 0));

  const openEmail = emails.find((e) => e.id === openEmailId) || emails[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute inset-4 rounded-2xl bg-background border border-border overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-card/80 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-foreground font-semibold truncate">{batch.label}</h2>
              <Badge variant="outline" className="border-border text-muted-foreground bg-muted/40">
                {selectedCount}/{emails.length} selected
              </Badge>
              {!!batch.aiSuggestion && (
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                  {batch.aiSuggestion}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Estimated time saved: {batch.estimatedTimeSaved} min</div>
          </div>

          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-border bg-card/60 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Checkbox checked={selectedCount === emails.length && emails.length > 0} onCheckedChange={(v) => toggleAll(!!v)} />
            <span className="text-sm text-muted-foreground">Select all</span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <Input
              value={assignToUserId || ""}
              onChange={(e) => onAssignToUserIdChange?.(e.target.value)}
              placeholder="Assign to userId (optional)"
              className="w-[240px]"
            />
            <Button
              variant="outline"
              disabled={loading || selectedIds.length === 0 || !onAssignAll}
              onClick={() => onAssignAll?.(selectedIds, batch.id, assignToUserId)}
              title="Assign selected"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <FolderInput className="h-4 w-4 text-muted-foreground" />
            <Input
              value={moveToCategory || ""}
              onChange={(e) => onMoveToCategoryChange?.(e.target.value)}
              placeholder="Move to category (optional)"
              className="w-[240px]"
            />
            <Button
              variant="outline"
              disabled={loading || selectedIds.length === 0 || !onMoveAll}
              onClick={() => onMoveAll?.(selectedIds, batch.id, moveToCategory)}
              title="Move selected"
            >
              <FolderInput className="h-4 w-4 mr-2" />
              Move
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="mr-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1">
              <Checkbox checked={safeModeEnabled} onCheckedChange={(v) => setSafeModeEnabled(!!v)} />
              <span className="text-xs text-muted-foreground">Safe mode</span>
            </div>
            <Button
              variant="outline"
              disabled={loading || selectedIds.length === 0}
              onClick={() => onSaveDrafts(selectedIds, batch.id, selectedDraftsMap)}
            >
              <Save className="h-4 w-4 mr-2" />
              Save drafts
            </Button>

            <Button
              disabled={!canSend}
              onClick={() => onSendAll(selectedIds, batch.id, selectedDraftsMap)}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>

            <Button
              variant="outline"
              disabled={loading || selectedIds.length === 0 || !onResolveAll}
              onClick={() => onResolveAll?.(selectedIds, batch.id)}
              title="Resolve selected"
            >
              <Check className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              disabled={loading || selectedIds.length === 0 || !onArchiveAll}
              onClick={() => onArchiveAll?.(selectedIds, batch.id)}
              title="Archive selected"
            >
              <Archive className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              disabled={loading || selectedIds.length === 0 || !onRejectAll}
              onClick={() => onRejectAll?.(selectedIds, batch.id)}
              title="Reject selected"
            >
              <Ban className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {safeModeEnabled && (
          <div className="px-6 py-2 border-b border-border bg-amber-500/5 flex flex-wrap items-center gap-3">
            <span className="text-xs text-amber-500">
              Safe mode requires non-empty drafts for all selected emails before sending.
            </span>
            {selectedMissingDraftCount > 0 ? (
              <span className="text-xs text-muted-foreground">
                Missing drafts: {selectedMissingDraftCount}
              </span>
            ) : (
              <span className="text-xs text-emerald-500">All selected drafts are ready.</span>
            )}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={ackReadyToSend}
                onCheckedChange={(v) => setAckReadyToSend(!!v)}
                disabled={selectedMissingDraftCount > 0}
              />
              I reviewed and approve these drafts for send
            </label>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 grid grid-cols-2 overflow-hidden">
          {/* Left list */}
          <div className="border-r border-border overflow-y-auto">
            <div className="divide-y divide-border">
              {emails.map((e) => {
                const checked = selectedIds.includes(e.id);
                const isOpenRow = e.id === openEmailId;

                return (
                  <div
                    key={e.id}
                    className={`p-4 cursor-pointer hover:bg-muted/40 ${isOpenRow ? "bg-muted/50" : ""}`}
                    onClick={() => setOpenEmailId(e.id)}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleOne(e.id, !!v)}
                        onClick={(ev) => ev.stopPropagation()}
                        className="mt-0.5"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {e.priority}
                          </Badge>
                          <div className="text-foreground font-medium truncate">{e.originalSubject || "(No subject)"}</div>
                        </div>

                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="truncate">{e.customerEmail}</span>
                          <span>•</span>
                          <span>{timeAgo(e.receivedAt)}</span>
                          {e.orderId ? (
                            <>
                              <span>•</span>
                              <span className="text-primary">{e.orderId}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={async (ev) => {
                          ev.stopPropagation();
                          const next = await onRegenerateResponse(e.id);
                          setDraftEdits((prev) => ({ ...prev, [e.id]: next || prev[e.id] || "" }));
                        }}
                        title="Regenerate response"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {emails.length === 0 ? <div className="p-6 text-muted-foreground">Nothing selected.</div> : null}
            </div>
          </div>

          {/* Right review/editor */}
          <div className="overflow-y-auto p-6 space-y-4">
            {!openEmail ? (
              <div className="text-muted-foreground">Select an item to review.</div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-foreground font-semibold truncate">{openEmail.originalSubject || "(No subject)"}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {openEmail.customerName} • {openEmail.customerEmail} • {timeAgo(openEmail.receivedAt)}
                    </div>
                  </div>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {openEmail.priority}
                  </Badge>
                </div>

                <Card className="bg-card/70 border-border p-4">
                  <div className="text-xs text-muted-foreground mb-2">ORIGINAL</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{openEmail.originalBody || "—"}</div>
                </Card>

                <Card className="bg-card/70 border-border p-4">
                  <div className="text-xs text-muted-foreground mb-2">DRAFT (EDITABLE)</div>
                  <textarea
                    value={draftEdits[openEmail.id] ?? ""}
                    onChange={(e) => setDraftEdits((prev) => ({ ...prev, [openEmail.id]: e.target.value }))}
                    className="w-full min-h-[240px] rounded-xl bg-background border border-border text-foreground p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Edit the response here…"
                  />
                  <div className="text-xs text-muted-foreground mt-2">
                    Save drafts / Send will use these edited drafts for the selected items.
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
