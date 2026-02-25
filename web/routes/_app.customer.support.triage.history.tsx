import { useEffect, useMemo, useState } from "react";
import {
  Link as RouterLink,
  useLocation,
  useSearchParams,
} from "react-router";
import { useFindMany, useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
import { getAiCommentStyle } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";
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
  Calendar,
  Tag,
  Users,
  UserX,
  RotateCcw,
} from "lucide-react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";

const statusStyles: Record<string, string> = {
  completed: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  partial: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  failed: "text-red-300 bg-red-500/10 border-red-500/30",
  in_progress: "text-sky-300 bg-sky-500/10 border-sky-500/30",
};

const resultStyles: Record<string, string> = {
  sent: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  draft: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  archived: "text-slate-300 bg-slate-700/40 border-slate-600",
  resolved: "text-sky-300 bg-sky-500/10 border-sky-500/30",
  rejected: "text-rose-300 bg-rose-500/10 border-rose-500/30",
  moved: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
  assigned: "text-teal-300 bg-teal-500/10 border-teal-500/30",
  error: "text-red-300 bg-red-500/10 border-red-500/30",
  draft_override_applied: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

export default function TriageHistoryPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBatchId = searchParams.get("batch");
  const viewMode = searchParams.get("view") || "batches";

  const [{ data: rawBatches, fetching: fetchingBatches }, refreshBatches] = useFindMany(api.batchOperation, {
    sort: { createdAt: "Descending" },
    first: 100,
    select: {
      id: true,
      batchId: true,
      label: true,
      type: true,
      action: true,
      status: true,
      emailCount: true,
      sentCount: true,
      savedCount: true,
      errorCount: true,
      createdAt: true,
      completedAt: true,
      timeSaved: true,
      createdBy: true,
      notes: true,
      user: { id: true, email: true },
    },
  });

  const batches = (rawBatches as any[]) || [];
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) || null;

  const [{ data: rawNonCustomerConvs, fetching: fetchingNonCustomer }, refreshNonCustomer] = useFindMany(
    api.conversation,
    {
      pause: viewMode !== "non_customer",
      filter: { currentCategory: { equals: "not_customer" } },
      sort: { updatedAt: "Descending" },
      first: 100,
      select: {
        id: true,
        subject: true,
        primaryCustomerEmail: true,
        primaryCustomerName: true,
        status: true,
        currentCategory: true,
        updatedAt: true,
      },
    }
  );
  const nonCustomerConvs = (rawNonCustomerConvs as any[]) || [];

  const [{ fetching: undoing }, undoNotCustomer] = useGlobalAction(api.undoNotCustomer);

  useEffect(() => {
    if (viewMode !== "non_customer" && !selectedBatchId && batches.length > 0) {
      setSearchParams((prev) => ({ ...Object.fromEntries(prev), view: "batches", batch: batches[0].id }));
    }
  }, [viewMode, selectedBatchId, batches, setSearchParams]);

  const [{ data: rawComments, fetching: fetchingComments }] = useFindMany(api.aiComment, {
    pause: !selectedBatch?.id,
    filter: {
      batchOperationId: { equals: selectedBatch?.id ?? "" },
    },
    sort: { createdAt: "Descending" },
    first: 200,
    select: {
      id: true,
      kind: true,
      content: true,
      createdAt: true,
      metaJson: true,
      source: true,
      conversation: { id: true, subject: true, primaryCustomerEmail: true },
      user: { id: true, email: true },
    },
  });

  const comments = (rawComments as any[]) || [];

  const parsedComments = useMemo(() => {
    return comments.map((comment) => {
      let meta: Record<string, any> = {};
      if (comment.metaJson) {
        try {
          meta = JSON.parse(comment.metaJson);
        } catch {
          meta = {};
        }
      }
      return { ...comment, meta };
    });
  }, [comments]);

  const handleUndoNotCustomer = async (conversationId: string) => {
    try {
      await undoNotCustomer({ conversationId, restoreMode: "return_to_queue" });
      toast.success("Returned to triage queue");
      await refreshNonCustomer();
    } catch (err: any) {
      toast.error(err?.message || "Failed to return to queue");
    }
  };

  return (
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSupportSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Triage History"
          subtitle={viewMode === "non_customer" ? "Conversations marked as not a customer" : "Review batch operations and individual results"}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchParams((prev) => ({ ...Object.fromEntries(prev), view: "batches" }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode !== "non_customer"
                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  Batches
                </button>
                <button
                  onClick={() => setSearchParams({ view: "non_customer" })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    viewMode === "non_customer"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  Non-customer
                </button>
              </div>
              <SecondaryButton
                onClick={() => (viewMode === "non_customer" ? refreshNonCustomer() : refreshBatches())}
                disabled={viewMode === "non_customer" ? fetchingNonCustomer : fetchingBatches}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${(viewMode === "non_customer" ? fetchingNonCustomer : fetchingBatches) ? "animate-spin" : ""}`} />
                {(viewMode === "non_customer" ? fetchingNonCustomer : fetchingBatches) ? "Refreshing..." : "Refresh"}
              </SecondaryButton>
            </div>
          }
        />

        <div className="flex-1 overflow-hidden flex">
          {/* Left: Batch list or Non-customer list */}
          <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/30">
            <div className="flex-1 overflow-y-auto">
              {viewMode === "non_customer" ? (
                fetchingNonCustomer ? (
                  <EmptyState title="Loading non-customer list..." />
                ) : nonCustomerConvs.length === 0 ? (
                  <EmptyState
                    title="No non-customer conversations"
                    description="Conversations marked as Not a Customer will appear here. You can undo them to return to the triage queue."
                  />
                ) : (
                  <div className="divide-y divide-slate-800">
                    {nonCustomerConvs.map((conv: any) => (
                      <div
                        key={conv.id}
                        className="p-4 hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-100 line-clamp-2">
                            {conv.subject || "(No subject)"}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400 shrink-0">
                            NOT A CUSTOMER
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mb-2">
                          {conv.primaryCustomerEmail || conv.primaryCustomerName || "—"}
                        </div>
                        <div className="flex items-center gap-2">
                          <RouterLink
                            to={`/customer/support/conversations/${conv.id}`}
                            className="text-[11px] text-teal-400 hover:text-teal-300"
                          >
                            View
                          </RouterLink>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-teal-600 text-teal-400 hover:bg-teal-600/10"
                            onClick={() => handleUndoNotCustomer(conv.id)}
                            disabled={undoing}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Return to Queue
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : fetchingBatches ? (
                <EmptyState title="Loading batch history..." />
              ) : batches.length === 0 ? (
                <EmptyState title="No batch operations found" description="Run a batch action to see results here." />
              ) : (
                <div className="divide-y divide-slate-800">
                  {batches.map((batch) => {
                    const isSelected = batch.id === selectedBatchId;
                    const statusClass = statusStyles[batch.status] || statusStyles.completed;
                    return (
                      <button
                        key={batch.id}
                        onClick={() => setSearchParams({ batch: batch.id })}
                        className={`w-full text-left p-4 transition-colors ${
                          isSelected ? "bg-slate-800/80 border-l-2 border-teal-500" : "hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-100">
                              {batch.label || "Batch operation"}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                              {batch.action || "action"} · {batch.type || "general"}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}
                          >
                            {batch.status || "completed"}
                          </span>
                        </div>
                        <div className="mt-3 text-xs text-slate-400">
                          {batch.sentCount ?? 0} sent · {batch.savedCount ?? 0} drafts · {batch.errorCount ?? 0} errors
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {formatDateTime(batch.createdAt)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Batch detail or Non-customer info */}
          <div className="flex-1 overflow-y-auto bg-slate-950">
            {viewMode === "non_customer" ? (
              <div className="p-8">
                <div className="max-w-xl mx-auto">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <UserX className="h-8 w-8 text-amber-400" />
                      <h3 className="text-lg font-semibold text-white">Non-customer conversations</h3>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                      These conversations were marked as Not a Customer and removed from the triage queue. Use <strong className="text-slate-300">Return to Queue</strong> to undo and restore them.
                    </p>
                    <p className="text-xs text-slate-500">
                      {nonCustomerConvs.length} conversation{nonCustomerConvs.length !== 1 ? "s" : ""} marked
                    </p>
                  </div>
                </div>
              </div>
            ) : !selectedBatch ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a batch to view details</p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-white">
                          {selectedBatch.label || "Batch operation"}
                        </h2>
                        <div className="text-sm text-slate-400 mt-1">
                          {selectedBatch.action || "action"} · {selectedBatch.type || "general"}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          statusStyles[selectedBatch.status] || statusStyles.completed
                        }`}
                      >
                        {selectedBatch.status || "completed"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          Created by
                        </div>
                        <div className="text-sm text-slate-200">
                          {selectedBatch.user?.email || selectedBatch.createdBy || "system"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Created at
                        </div>
                        <div className="text-sm text-slate-200">{formatDateTime(selectedBatch.createdAt)}</div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-2">
                          <Tag className="h-3 w-3" />
                          Batch ID
                        </div>
                        <div className="text-sm text-slate-200">{selectedBatch.batchId || selectedBatch.id}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Emails</div>
                        <div className="text-lg font-semibold text-slate-100">{selectedBatch.emailCount ?? 0}</div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Sent</div>
                        <div className="text-lg font-semibold text-emerald-300">{selectedBatch.sentCount ?? 0}</div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Drafts</div>
                        <div className="text-lg font-semibold text-amber-300">{selectedBatch.savedCount ?? 0}</div>
                      </div>
                      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Errors</div>
                        <div className="text-lg font-semibold text-red-300">{selectedBatch.errorCount ?? 0}</div>
                      </div>
                    </div>

                    {selectedBatch.notes && (
                      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
                        {selectedBatch.notes}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">Results</h3>
                      <span className="text-xs text-slate-500">
                        {fetchingComments ? "Loading..." : `${parsedComments.length} entries`}
                      </span>
                    </div>

                    {fetchingComments ? (
                      <div className="text-sm text-slate-500">Loading results...</div>
                    ) : parsedComments.length === 0 ? (
                      <div className="text-sm text-slate-500">No result entries logged for this batch.</div>
                    ) : (
                      <div className="space-y-3">
                        {parsedComments.map((comment) => {
                          const style = getAiCommentStyle(comment.kind);
                          const status = comment.meta?.status;
                          const statusClass = status ? resultStyles[status] : "";
                          const conversationId = comment.conversation?.id;
                          return (
                            <div
                              key={comment.id}
                              className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"
                            >
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}
                                  >
                                    <style.Icon className="h-3 w-3" />
                                    {style.label}
                                  </span>
                                  {status && (
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                        statusClass || "text-slate-300 bg-slate-700/40 border-slate-600"
                                      }`}
                                    >
                                      {status}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className="text-[11px] text-slate-500"
                                  title={comment.createdAt ? new Date(comment.createdAt).toLocaleString() : "Unknown"}
                                >
                                  {timeAgo(comment.createdAt)}
                                </span>
                              </div>

                              <div className="text-xs text-slate-300 whitespace-pre-wrap">
                                {comment.content}
                              </div>

                              <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                                {conversationId ? (
                                  <RouterLink
                                    to={`/customer/support/conversations/${conversationId}`}
                                    className="text-teal-400 hover:text-teal-300"
                                  >
                                    {comment.conversation?.subject || "View conversation"}
                                  </RouterLink>
                                ) : (
                                  <span>{comment.conversation?.primaryCustomerEmail || "Conversation unavailable"}</span>
                                )}
                                <span>·</span>
                                <span>{comment.source || "system"}</span>
                                {comment.user?.email ? <span>· {comment.user.email}</span> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
