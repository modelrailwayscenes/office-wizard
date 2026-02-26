import { useMemo, useState } from "react";
import { useFindMany, useGlobalAction } from "@gadgetinc/react";
import { Link as RouterLink, useLocation } from "react-router";
import { toast } from "sonner";
import { api } from "../api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton, PrimaryButton, DangerButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
import { timeAgo } from "@/components/healthStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LayoutDashboard,
  CircleHelp,
  MessageSquare,
  Layers,
  FileText,
  PenLine,
  Settings,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Mail,
  User,
  AlertTriangle,
} from "lucide-react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";

const statusStyles: Record<string, string> = {
  pending_review: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  approved: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  rejected: "text-red-300 bg-red-500/10 border-red-500/30",
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default function QuarantinePage() {
  const location = useLocation();
  const [statusFilter, setStatusFilter] = useState<"pending_review" | "approved" | "rejected" | "all">("pending_review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveReason, setApproveReason] = useState("");
  const [allowlistSender, setAllowlistSender] = useState(false);

  const [{ data: rawQuarantine, fetching }, refresh] = useFindMany(api.emailQuarantine, {
    sort: { receivedAt: "Descending" },
    first: 200,
    select: {
      id: true,
      fromAddress: true,
      fromName: true,
      subject: true,
      bodyPreview: true,
      receivedAt: true,
      status: true,
      classificationReason: true,
      approvedAt: true,
      rejectedAt: true,
      providerMessageId: true,
    },
  });

  const [{ fetching: approving }, approveQuarantinedEmail] = useGlobalAction(api.approveQuarantinedEmail);
  const [{ fetching: rejecting }, rejectQuarantinedEmail] = useGlobalAction(api.rejectQuarantinedEmail);

  const quarantineItems = (rawQuarantine as any[]) || [];
  const filteredItems = useMemo(() => {
    if (statusFilter === "all") return quarantineItems;
    return quarantineItems.filter((item) => item.status === statusFilter);
  }, [quarantineItems, statusFilter]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

  const handleApprove = async (itemId: string) => {
    try {
      await approveQuarantinedEmail({
        quarantineId: itemId,
        addSenderToAllowlist: allowlistSender,
        approvalReason: approveReason.trim() || "manually approved",
      });
      toast.success("Email approved");
      setAllowlistSender(false);
      setApproveReason("");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Approve failed");
    }
  };

  const handleReject = async (itemId: string, reason?: string) => {
    try {
      await rejectQuarantinedEmail({
        quarantineId: itemId,
        reason: (reason || rejectReason || "manually rejected").trim() || "manually rejected",
      });
      toast.success("Email rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || "Reject failed");
    }
  };

  const openRejectDialog = () => {
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const closeRejectDialog = () => {
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <div className="flex flex-1 min-h-0 bg-background text-foreground">
      <CustomerSupportSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Quarantine"
          subtitle="Review and approve quarantined emails"
          actions={
            <>
              <SecondaryButton onClick={() => refresh()} disabled={fetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                {fetching ? "Refreshing..." : "Refresh"}
              </SecondaryButton>
            </>
          }
        />

        <div className="px-8 pt-6">
          <div className="flex items-center gap-2">
            {(["pending_review", "approved", "rejected", "all"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-xs uppercase tracking-wide px-3 py-1 rounded-full border ${
                  statusFilter === status
                    ? "border-primary/40 text-primary/80 bg-primary/10"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex mt-4">
          {/* Left list */}
          <div className="w-1/3 border-r border-border flex flex-col bg-card/30">
            <div className="flex-1 overflow-y-auto">
              {fetching ? (
                <EmptyState title="Loading quarantined emails..." />
              ) : filteredItems.length === 0 ? (
                <EmptyState title="No quarantined emails" description="Try changing the filter or refresh." />
              ) : (
                <div className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const isSelected = item.id === selectedId;
                    const statusClass = statusStyles[item.status] || statusStyles.pending_review;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          isSelected ? "bg-muted/80 border-l-2 border-primary" : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {item.subject || "(No subject)"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {item.fromName || item.fromAddress || "Unknown sender"}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          {timeAgo(item.receivedAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right detail */}
          <div className="flex-1 overflow-y-auto bg-background">
            {!selectedItem ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <ShieldAlert className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a quarantined email to review</p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="rounded-xl border border-border bg-card/50 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-foreground">
                          {selectedItem.subject || "(No subject)"}
                        </h2>
                        <div className="text-sm text-muted-foreground mt-1">
                          {selectedItem.fromName || selectedItem.fromAddress || "Unknown sender"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          statusStyles[selectedItem.status] || statusStyles.pending_review
                        }`}
                      >
                        {selectedItem.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Sender
                        </div>
                        <div className="text-sm text-foreground">{selectedItem.fromAddress || "—"}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          Received
                        </div>
                        <div className="text-sm text-foreground">{formatDateTime(selectedItem.receivedAt)}</div>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3" />
                          Reason
                        </div>
                        <div className="text-sm text-foreground">
                          {selectedItem.classificationReason || "Manual review"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Message ID</div>
                        <div className="text-xs text-muted-foreground break-all">
                          {selectedItem.providerMessageId || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-lg border border-border bg-background/40 p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Preview</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedItem.bodyPreview || "No preview available."}
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                          Approval note
                        </div>
                        <Textarea
                          value={approveReason}
                          onChange={(e) => setApproveReason(e.target.value)}
                          placeholder="e.g. legitimate customer follow-up"
                          className="min-h-[70px]"
                        />
                        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={allowlistSender}
                            onCheckedChange={(v) => setAllowlistSender(Boolean(v))}
                          />
                          Add sender to allowlist after approval
                        </label>
                      </div>
                      <div className="rounded-lg border border-border bg-background/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
                          Review hints
                        </div>
                        <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                          <li>Approve only if sender and intent are legitimate.</li>
                          <li>Reject spam/phishing and provide a clear reason.</li>
                          <li>Use allowlist only for trusted recurring senders.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center gap-3">
                      <PrimaryButton
                        onClick={() => handleApprove(selectedItem.id)}
                        disabled={approving || selectedItem.status === "approved"}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {selectedItem.status === "approved" ? "Approved" : "Approve"}
                      </PrimaryButton>
                      <SecondaryButton
                        onClick={openRejectDialog}
                        disabled={rejecting || selectedItem.status === "rejected" || selectedItem.status === "approved"}
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        {selectedItem.status === "rejected" ? "Rejected" : "Reject"}
                      </SecondaryButton>
                    </div>
                  </div>

                  {selectedItem.approvedAt && (
                    <div className="text-xs text-muted-foreground">
                      Approved {formatDateTime(selectedItem.approvedAt)}
                    </div>
                  )}
                  {selectedItem.rejectedAt && (
                    <div className="text-xs text-muted-foreground">
                      Rejected {formatDateTime(selectedItem.rejectedAt)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject confirmation dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={(open) => !open && closeRejectDialog()}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle>Reject quarantined email?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This email will be marked as rejected and will not be imported. You can optionally add a reason below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="reject-reason" className="text-muted-foreground">
              Reason (optional)
            </Label>
            <div className="flex flex-wrap gap-2">
              {[
                "Spam",
                "Phishing risk",
                "Unknown sender",
                "Not support related",
                "Duplicate",
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setRejectReason(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Spam, wrong address, duplicate"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[80px]"
              disabled={rejecting}
            />
          </div>
          <DialogFooter className="gap-2">
            <SecondaryButton onClick={closeRejectDialog} disabled={rejecting}>
              Cancel
            </SecondaryButton>
            <DangerButton
              onClick={() => selectedItem && handleReject(selectedItem.id)}
              disabled={rejecting || !selectedItem}
            >
              {rejecting ? "Rejecting..." : "Reject"}
            </DangerButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}