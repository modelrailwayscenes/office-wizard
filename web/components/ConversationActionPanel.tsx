import { useMemo, useRef, useState } from "react";
import { useAction, useFindMany, useGlobalAction, useUser } from "@gadgetinc/react";
import { Bold, Italic, List, ListOrdered, Link2, Paperclip, Send, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function toPlainText(html: string) {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim();
}

export function ConversationActionPanel({
  conversation,
  onUpdated,
}: {
  conversation: any;
  onUpdated?: () => Promise<void> | void;
}) {
  const currentUser = useUser(api, { select: { id: true, email: true } }) as any;
  const [{ data: users }] = useFindMany(api.user, {
    first: 200,
    select: { id: true, email: true, emailVerified: true } as any,
  });
  const [{ data: signatures }] = useFindMany(api.signature, {
    first: 50,
    select: { id: true, name: true, signOff: true, body: true } as any,
  });

  const [{ fetching: updating }, updateConversation] = useAction(api.conversation.update);
  const [{ fetching: generating }, generateDraft] = useGlobalAction(api.generateDraft);
  const [{ fetching: runningBatch }, runBatchOperation] = useGlobalAction(api.runBatchOperation);

  const [assignToUserId, setAssignToUserId] = useState<string>(conversation?.assignedToUser?.id || "");
  const [status, setStatus] = useState<string>(conversation?.status || "new");
  const [priorityBand, setPriorityBand] = useState<string>(conversation?.currentPriorityBand || "unclassified");
  const [noteDraft, setNoteDraft] = useState("");
  const [signatureId, setSignatureId] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [composerHtml, setComposerHtml] = useState<string>("");

  const selectedSignature = useMemo(
    () => (signatures as any[] | undefined)?.find((s) => s.id === signatureId),
    [signatures, signatureId]
  );

  const exec = (command: string) => {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    document.execCommand(command);
    setComposerHtml(editorRef.current?.innerHTML || "");
  };

  const addNote = async () => {
    const trimmed = noteDraft.trim();
    if (!trimmed) return;
    const stamp = new Date().toISOString();
    const line = `[${stamp}] ${currentUser?.email || "agent"}: ${trimmed}`;
    const merged = [conversation?.internalNotes, line].filter(Boolean).join("\n");
    await (updateConversation as any)({ id: conversation.id, internalNotes: merged });
    setNoteDraft("");
    toast.success("Internal note added");
    await onUpdated?.();
  };

  const saveMeta = async () => {
    await (updateConversation as any)({
      id: conversation.id,
      assignedToUser: assignToUserId || null,
      status,
      currentPriorityBand: priorityBand,
    });
    toast.success("Conversation updated");
    await onUpdated?.();
  };

  const saveComposerAsDraft = async () => {
    const main = toPlainText(composerHtml || "");
    if (!main) {
      toast.error("Add a reply before saving");
      return;
    }
    const sig = selectedSignature
      ? `${selectedSignature.signOff}\n${selectedSignature.body}`
      : "";
    const draftText = [main, sig].filter(Boolean).join("\n\n");
    await (updateConversation as any)({
      id: conversation.id,
      aiDraftContent: draftText,
      hasDraft: true,
      draftStatus: "edited",
      draftLastUpdatedAt: new Date().toISOString(),
    });
    toast.success("Draft saved");
    await onUpdated?.();
  };

  const sendReply = async () => {
    const main = toPlainText(composerHtml || "");
    if (!main) {
      toast.error("Add a reply before sending");
      return;
    }
    const sig = selectedSignature
      ? `${selectedSignature.signOff}\n${selectedSignature.body}`
      : "";
    const draftText = [main, sig].filter(Boolean).join("\n\n");

    await (updateConversation as any)({
      id: conversation.id,
      aiDraftContent: draftText,
      hasDraft: true,
      draftStatus: "edited",
      draftLastUpdatedAt: new Date().toISOString(),
    });

    await runBatchOperation({
      action: "send",
      conversationIds: JSON.stringify([conversation.id]),
      emailIds: JSON.stringify([]),
      estimatedTimeSaved: 1,
      notes: "Single send from detail panel",
    } as any);

    toast.success("Reply sent");
    await onUpdated?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select value={assignToUserId || "unassigned"} onValueChange={(v) => setAssignToUserId(v === "unassigned" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Assign user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {(users as any[] | undefined)
              ?.filter((u) => u?.emailVerified)
              ?.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.email}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="waiting_customer">Waiting customer</SelectItem>
            <SelectItem value="waiting_internal">Waiting internal</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityBand} onValueChange={setPriorityBand}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unclassified">Unclassified</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={saveMeta} disabled={updating}>
          Save metadata
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            if (!currentUser?.id) {
              toast.error("Current user not available");
              return;
            }
            setAssignToUserId(currentUser.id);
            await (updateConversation as any)({ id: conversation.id, assignedToUser: currentUser.id });
            toast.success("Assigned to me");
            await onUpdated?.();
          }}
          disabled={updating}
        >
          Assigned to me
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Internal notes</div>
        <textarea
          className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Add internal note..."
        />
        <Button variant="outline" size="sm" onClick={addNote} disabled={!noteDraft.trim() || updating}>
          Add note
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Reply composer</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="icon" onClick={() => exec("bold")} title="Bold">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => exec("italic")} title="Italic">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => exec("insertUnorderedList")} title="Bullet list">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => exec("insertOrderedList")} title="Numbered list">
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const url = window.prompt("Enter link URL");
              if (url) {
                if (editorRef.current) editorRef.current.focus();
                document.execCommand("createLink", false, url);
                setComposerHtml(editorRef.current?.innerHTML || "");
              }
            }}
            title="Insert link"
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            await generateDraft({ conversationId: conversation.id, regenerate: true } as any);
            toast.success("AI draft generated");
            await onUpdated?.();
          }} disabled={generating}>
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Generate AI draft"}
          </Button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => setComposerHtml((e.target as HTMLDivElement).innerHTML)}
          className="min-h-[140px] rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select value={signatureId || "none"} onValueChange={(v) => setSignatureId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose signature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No signature</SelectItem>
              {(signatures as any[] | undefined)?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            <span className="truncate">{attachments.length > 0 ? `${attachments.length} attachment(s)` : "Attach files (optional)"}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(e) => setAttachments(Array.from(e.target.files || []))}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={saveComposerAsDraft} disabled={updating || runningBatch}>
            <Save className="h-4 w-4 mr-2" />
            Save draft
          </Button>
          <Button onClick={sendReply} disabled={updating || runningBatch}>
            <Send className="h-4 w-4 mr-2" />
            Send reply
          </Button>
        </div>
      </div>
    </div>
  );
}
