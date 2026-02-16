import { useMemo, useState } from "react";
import { useFindMany, useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import BatchReviewModal from "@/components/BatchReviewModal";
import {
  Mail,
  Clock,
  User,
  Tag,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  Archive,
  CheckSquare,
} from "lucide-react";

export default function TriageQueuePage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "urgent" | "pending" | "due" | "starred">("all");
  const [generatingDraft, setGeneratingDraft] = useState(false);

  // EmailMessage-first selection (IMPORTANT)
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // Optional toolbar fields (modal supports these)
  const [assignToUserId, setAssignToUserId] = useState("");
  const [moveToCategory, setMoveToCategory] = useState("");

  // ── Helper: Extract order numbers from text ────────────────────────────────
  const extractOrderNumber = (text: string): string | null => {
    const match = text?.match(/\b(MRS|NRS)[-\s]?\d{5}\b/i);
    return match ? match[0].replace(/\s/g, "-").toUpperCase() : null;
  };

  // ── Helper: Get all order numbers from conversation ───────────────────────
  const getOrderNumbers = (conv: any): string[] => {
    const orders = new Set<string>();

    const subjectOrder = extractOrderNumber(conv.subject || "");
    if (subjectOrder) orders.add(subjectOrder);

    conv.messages?.edges?.forEach((edge: any) => {
      const msg = edge?.node;
      const bodyOrder = extractOrderNumber(msg?.bodyPreview || "");
      if (bodyOrder) orders.add(bodyOrder);
    });

    return Array.from(orders);
  };

  const [{ data: conversationsData }, refresh] = useFindMany(api.conversation, {
    filter: { status: { notEquals: "resolved" } },
    select: {
      id: true,
      subject: true,
      primaryCustomerEmail: true,
      primaryCustomerName: true,
      currentPriorityBand: true,
      currentPriorityScore: true,
      currentCategory: true,
      status: true,
      sentiment: true,
      requiresHumanReview: true,
      messageCount: true,
      unreadCount: true,
      firstMessageAt: true,
      latestMessageAt: true,
      automationTag: true,
      aiDraftContent: true,
      aiDraftGeneratedAt: true,
      aiDraftModel: true,
      messages: {
        edges: {
          node: {
            id: true, // ✅ treat this as emailMessage id
            subject: true,
            bodyPreview: true,
            fromAddress: true,
            fromName: true,
            receivedDateTime: true,
          },
        },
      },
    },
    sort: [{ currentPriorityScore: "Descending" }, { latestMessageAt: "Descending" }],
  });

  const conversations = conversationsData as any[];

  const [{ fetching: triaging }, runTriage] = useGlobalAction(api.triageAllPending);
  const [{ fetching: batchLoading }, runBatchOperation] = useGlobalAction(api.runBatchOperation);
  const [{ fetching: applyEditsLoading }, applyDraftEdits] = useGlobalAction(api.applyDraftEdits);
  const [, generateDraft] = useGlobalAction(api.generateDraft);

  const handleRunTriage = async () => {
    try {
      const result = (await runTriage({})) as any;
      toast.success(`Triage complete! Processed: ${result.processed}`);
      refresh();
    } catch (err: any) {
      toast.error(`Triage failed: ${err?.message || String(err)}`);
    }
  };

  const handleGenerateDraft = async (conversationId: string, regenerate = false) => {
    setGeneratingDraft(true);
    try {
      await generateDraft({ conversationId, regenerate });
      toast.success(regenerate ? "Draft regenerated!" : "Draft generated!");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const getPrimaryEmailId = (conv: any): string | null => {
    const primaryMsg = conv?.messages?.edges?.[0]?.node;
    return primaryMsg?.id || null;
  };

  const handleToggleEmailSelection = (emailId: string, checked: boolean) => {
    setSelectedEmailIds((prev) => {
      if (checked) return prev.includes(emailId) ? prev : [...prev, emailId];
      return prev.filter((id) => id !== emailId);
    });
  };

  const selectedConv = conversations?.find((c: any) => c.id === selectedConvId) as any;
  const firstMessage = selectedConv?.messages?.edges?.[0]?.node as any;

  // Priority counts
  const criticalCount = conversations?.filter((c: any) => c.currentPriorityBand === "urgent").length || 0;
  const totalQueue = conversations?.length || 0;

  const getPriorityLabel = (band: string | null | undefined) => {
    switch (band) {
      case "urgent":
        return "URGENT";
      case "high":
        return "HIGH";
      case "medium":
        return "MEDIUM";
      case "low":
        return "LOW";
      case "unclassified":
        return "UNCLASSIFIED";
      default:
        return "UNCLASSIFIED";
    }
  };

  const formatTime = (date: string | null | undefined) => {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  // ✅ Batch object uses emailMessage IDs (not conversation IDs)
  const batchForModal = useMemo(() => {
    const emails =
      (conversations || [])
        .map((c: any) => {
          const primaryMsg = c?.messages?.edges?.[0]?.node;
          const emailId = primaryMsg?.id;
          if (!emailId) return null;

          return {
            id: emailId, // ✅ emailMessage id
            conversationId: c.id, // keep for context/debug
            customerName: c.primaryCustomerName || "Unknown",
            customerEmail: c.primaryCustomerEmail || "unknown@example.com",
            orderId: getOrderNumbers(c)[0],
            priority:
              c.currentPriorityBand === "urgent"
                ? "P1"
                : c.currentPriorityBand === "high"
                  ? "P2"
                  : c.currentPriorityBand === "medium"
                    ? "P3"
                    : "P4",
            receivedAt: primaryMsg?.receivedDateTime || c.latestMessageAt || c.firstMessageAt || new Date().toISOString(),
            originalSubject: primaryMsg?.subject || c.subject || "(No subject)",
            originalBody: primaryMsg?.bodyPreview || "",
            aiResponse: c.aiDraftContent || "",
            hasDraft: !!c.aiDraftContent,
            status: "pending" as const,
          };
        })
        .filter(Boolean)
        .filter((e: any) => selectedEmailIds.includes(e.id)) || [];

    return {
      id: "batch-selected",
      type: "manual",
      label: `Selected (${selectedEmailIds.length})`,
      emails,
      aiSuggestion: `Review and process ${emails.length} item(s).`,
      estimatedTimeSaved: emails.length * 3,
    };
  }, [conversations, selectedEmailIds]);

  const showPendingOnly = activeTab === "pending";
  const showUrgentOnly = activeTab === "urgent";

  const filteredConversations =
    conversations
      ?.filter((c: any) => {
        if (showUrgentOnly && c.currentPriorityBand !== "urgent") return false;
        if (showPendingOnly && !c.requiresHumanReview) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.subject?.toLowerCase().includes(q) ||
          c.primaryCustomerEmail?.toLowerCase().includes(q) ||
          c.primaryCustomerName?.toLowerCase().includes(q) ||
          getOrderNumbers(c).some((o) => o.toLowerCase().includes(q))
        );
      }) ?? [];

  const draftsPendingCount = conversations?.filter((c: any) => c.requiresHumanReview).length || 0;

  const loading = batchLoading || applyEditsLoading;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Triage Queue</h1>
            <p className="text-sm text-slate-400 mt-1">Browse and search all emails with a flexible approach to triage</p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/10">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {draftsPendingCount} DRAFTS PENDING
            </Badge>

            {/* ✅ screenshot fix: selectedEmailIds (not selectedConvIds) */}
            {selectedEmailIds.length > 0 && (
              <Button
                onClick={() => setBatchModalOpen(true)}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Batch Actions ({selectedEmailIds.length})
              </Button>
            )}

            <Button
              onClick={handleRunTriage}
              disabled={triaging}
              className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
            >
              {triaging ? "Running..." : "Run Triage"}
            </Button>

            <Button onClick={refresh} variant="outline" className="border-slate-700 hover:bg-slate-800">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-8 py-4 border-b border-slate-800">
        <Input
          placeholder="Search by customer, order ID, subject, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 h-[calc(100vh-180px)]">
        {/* Left List */}
        <div className="w-1/2 border-r border-slate-800 overflow-y-auto">
          {/* Quick Filters */}
          <div className="flex gap-2 p-4 border-b border-slate-800 bg-slate-900/30">
            <Button
              variant={activeTab === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("all")}
              className={activeTab === "all" ? "bg-teal-500 hover:bg-teal-600 text-black" : ""}
            >
              ALL ({totalQueue})
            </Button>

            <Button
              variant={activeTab === "urgent" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("urgent")}
              className={activeTab === "urgent" ? "bg-red-500 hover:bg-red-600 text-black" : ""}
            >
              URGENT ({criticalCount})
            </Button>

            <Button
              variant={activeTab === "pending" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("pending")}
              className={activeTab === "pending" ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}
            >
              PENDING
            </Button>
          </div>

          {/* Conversation List */}
          <div className="divide-y divide-slate-800">
            {filteredConversations.length === 0 && (
              <div className="p-8 text-center text-slate-500">No conversations to triage</div>
            )}

            {filteredConversations.map((conv: any) => {
              const emailId = getPrimaryEmailId(conv);
              const checked = !!emailId && selectedEmailIds.includes(emailId);

              return (
                <div
                  key={conv.id}
                  className={`p-4 hover:bg-slate-900/50 transition-colors ${
                    selectedConvId === conv.id ? "bg-slate-900/80 border-l-2 border-teal-500" : ""
                  }`}
                >
                  {/* Row 1 */}
                  <div className="flex items-start gap-2 mb-2">
                    <Checkbox
                      checked={checked}
                      disabled={!emailId}
                      onCheckedChange={(v) => {
                        if (!emailId) return;
                        handleToggleEmailSelection(emailId, !!v);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />

                    <UnifiedBadge type={conv.currentPriorityBand} label={getPriorityLabel(conv.currentPriorityBand)} />

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedConvId(conv.id)}>
                      <div className="text-white font-medium truncate">{conv.subject || "(No subject)"}</div>
                    </div>

                    {conv.requiresHumanReview && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                  </div>

                  {/* Row 2 */}
                  <div className="text-sm text-slate-400 truncate mb-2 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {conv.primaryCustomerEmail || conv.primaryCustomerName || "Unknown"}
                  </div>

                  {/* Row 3 */}
                  <div className="flex items-center gap-2 text-xs">
                    <SentimentBadge sentiment={conv.sentiment} />
                    <Separator orientation="vertical" className="h-4" />
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-500">{formatTime(conv.latestMessageAt)}</span>

                    {getOrderNumbers(conv).length > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Tag className="h-3 w-3 text-teal-400" />
                        <span className="text-teal-400">{getOrderNumbers(conv)[0]}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="w-1/2 overflow-y-auto">
          {!selectedConv ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a conversation to view details
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Conversation Header */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">{selectedConv.subject || "(No subject)"}</h2>
                <div className="text-sm text-slate-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{selectedConv.primaryCustomerName || selectedConv.primaryCustomerEmail || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{selectedConv.primaryCustomerEmail || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Original Message */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3">ORIGINAL MESSAGE</h3>
                <div className="text-sm text-slate-400 leading-relaxed">
                  {firstMessage?.bodyPreview || "No message content available"}
                </div>
              </Card>

              {/* AI-Generated Response */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    AI-GENERATED RESPONSE
                  </h3>
                </div>

                {selectedConv.aiDraftContent ? (
                  <>
                    <div className="text-sm text-white leading-relaxed bg-slate-950/50 p-4 rounded-lg border border-slate-700 mb-4 whitespace-pre-wrap">
                      Dear {selectedConv.primaryCustomerName || "Customer"},
                      {"\n\n"}
                      {selectedConv.aiDraftContent}
                      {"\n\n"}
                      Best regards,
                      {"\n"}
                      Model Railway Scenes Team
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-slate-700 hover:bg-slate-800"
                        onClick={() => handleGenerateDraft(selectedConv.id, true)}
                        disabled={generatingDraft}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${generatingDraft ? "animate-spin" : ""}`} />
                        {generatingDraft ? "Regenerating..." : "Regenerate"}
                      </Button>

                      <Button className="flex-1 bg-teal-500 hover:bg-teal-600 text-black font-medium">
                        <Send className="h-4 w-4 mr-2" />
                        Send Draft
                      </Button>

                      <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    className="w-full bg-teal-500 hover:bg-teal-600 text-black font-medium"
                    onClick={() => handleGenerateDraft(selectedConv.id, false)}
                    disabled={generatingDraft}
                  >
                    {generatingDraft ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Draft...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Generate AI Draft
                      </>
                    )}
                  </Button>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Batch Modal */}
      <BatchReviewModal
        batch={batchForModal}
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        loading={loading}
        assignToUserId={assignToUserId}
        onAssignToUserIdChange={setAssignToUserId}
        moveToCategory={moveToCategory}
        onMoveToCategoryChange={setMoveToCategory}
        onSendAll={async (emailIds, batchId, draftsByEmailId) => {
          // 1) persist edits
          await applyDraftEdits({
            emailIds: JSON.stringify(emailIds),
            draftsByEmailId: JSON.stringify(draftsByEmailId),
          });

          // 2) execute send batch
          await runBatchOperation({
            batchId,
            action: "send",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            estimatedTimeSaved: (emailIds?.length || 0) * 3,
          });

          toast.success(`Queued send for ${emailIds.length} item(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onSaveDrafts={async (emailIds, batchId, draftsByEmailId) => {
          // persist edits
          await applyDraftEdits({
            emailIds: JSON.stringify(emailIds),
            draftsByEmailId: JSON.stringify(draftsByEmailId),
          });

          // mark as draft batch
          await runBatchOperation({
            batchId,
            action: "save_drafts",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            estimatedTimeSaved: (emailIds?.length || 0) * 3,
          });

          toast.success(`Saved ${emailIds.length} draft(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onResolveAll={async (emailIds, batchId) => {
          await runBatchOperation({
            batchId,
            action: "resolve",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            estimatedTimeSaved: (emailIds?.length || 0) * 1,
          });

          toast.success(`Resolved ${emailIds.length} item(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onArchiveAll={async (emailIds, batchId) => {
          await runBatchOperation({
            batchId,
            action: "archive",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            estimatedTimeSaved: (emailIds?.length || 0) * 1,
          });

          toast.success(`Archived ${emailIds.length} item(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onRejectAll={async (emailIds, batchId) => {
          // You can extend the modal to collect a reject reason; for now pass a default.
          await runBatchOperation({
            batchId,
            action: "reject",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            rejectReason: "Rejected in batch review",
            estimatedTimeSaved: 0,
          });

          toast.success(`Rejected ${emailIds.length} item(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onAssignAll={async (emailIds, batchId, assignId) => {
          await runBatchOperation({
            batchId,
            action: "assign",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            assignToUserId: assignId,
            estimatedTimeSaved: 0,
          });

          toast.success(`Assigned ${emailIds.length} item(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onMoveAll={async (emailIds, batchId, category) => {
          // Only works if you implement "move" in runBatchOperation (see note below).
          await runBatchOperation({
            batchId,
            action: "move",
            emailIds: JSON.stringify(emailIds),
            conversationIds: JSON.stringify([]),
            type: category,
            label: `Move to ${category || "category"}`,
            estimatedTimeSaved: 0,
          });

          toast.success(`Moved ${emailIds.length} item(s)`);
          setBatchModalOpen(false);
          setSelectedEmailIds([]);
          refresh();
        }}
        onRegenerateResponse={async (emailId) => {
          // We regenerate at conversation-level; find the conversation containing this emailId.
          const conv = (conversations || []).find((c: any) => getPrimaryEmailId(c) === emailId);
          if (!conv?.id) return "Regenerated";
          await handleGenerateDraft(conv.id, true);
          return "Regenerated";
        }}
      />
    </div>
  );
}