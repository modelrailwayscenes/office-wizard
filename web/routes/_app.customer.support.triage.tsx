import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { useAction, useFindMany, useFindFirst, useGlobalAction, useUser } from "@gadgetinc/react";
import { api } from "../api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import BatchReviewModal from "@/components/BatchReviewModal";
import TelemetryBanner, { type PageTelemetry } from "@/components/TelemetryBanner";
import { StatusBar } from "@/components/StatusBar";
import { getAiCommentStyle } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";
import { ListSectionHeader } from "@/components/ListSectionHeader";
import { ConversationActionPanel } from "@/components/ConversationActionPanel";
import { formatSlaLabel, inferSlaState, slaStateToBadge } from "@/lib/sla";
import { evaluateDraftEligibility } from "@/lib/draftEligibility";
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
  LayoutDashboard,
  CircleHelp,
  MessageSquare,
  Layers,
  ShieldAlert,
  FileText,
  PenLine,
  Settings,
  UserX,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

// ── Main Page ───────────────────────────────────────────────────────
export default function TriageQueuePage() {
  const location = useLocation();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "urgent" | "pending" | "due" | "starred">("all");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [telemetry, setTelemetry] = useState<PageTelemetry | null>(null);
  const [triageRunBanner, setTriageRunBanner] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [assignToUserId, setAssignToUserId] = useState("");
  const [moveToCategory, setMoveToCategory] = useState("");
  const [markNotCustomerDialogOpen, setMarkNotCustomerDialogOpen] = useState(false);
  const [notCustomerReasonType, setNotCustomerReasonType] = useState("conversation_other");
  const [notCustomerPatternValue, setNotCustomerPatternValue] = useState("");
  const [notCustomerReasonDetails, setNotCustomerReasonDetails] = useState("");

  const extractOrderNumber = (text: string): string | null => {
    const match = text?.match(/\b(MRS|NRS)[-\s]?\d{5}\b/i);
    return match ? match[0].replace(/\s/g, "-").toUpperCase() : null;
  };

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

  const readSelectionMeta = (raw: string | null | undefined): any => {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const [{ data: conversationsData, fetching }, refresh] = useFindMany(api.conversation, {
    filter: {
      AND: [
        { status: { notEquals: "resolved" } },
        { status: { notEquals: "ignored" } },
        { currentCategory: { notEquals: "not_customer" } },
      ],
    } as any,
    select: {
      id: true,
      subject: true,
      primaryCustomerEmail: true,
      primaryCustomerName: true,
      currentPriorityBand: true,
      currentPriorityScore: true,
      currentCategory: true,
      assignedToUser: { id: true, email: true },
      status: true,
      sentiment: true,
      requiresHumanReview: true,
      isVerifiedCustomer: true,
      customerConfidenceScore: true,
      shopifyCustomerId: true,
      shopifyOrderNumbers: true,
      shopifyOrderContext: true,
      slaTarget: true,
      timeRemaining: true,
      deadlineDate: true,
      hasDeadline: true,
      messageCount: true,
      unreadCount: true,
      firstMessageAt: true,
      latestMessageAt: true,
      automationTag: true,
      aiDraftContent: true,
      aiDraftGeneratedAt: true,
      aiDraftModel: true,
      internalNotes: true,
      selectedPlaybook: { id: true, scenarioKey: true, name: true },
      selectedPlaybookConfidence: true,
      playbookSelectionMetaJson: true,
      messages: {
        edges: {
          node: {
            id: true,
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

  const [{ fetching: batchLoading }, runBatchOperation] = useGlobalAction(api.runBatchOperation);
  const [{ fetching: applyEditsLoading }, applyDraftEdits] = useGlobalAction(api.applyDraftEdits);
  const [, generateDraft] = useGlobalAction(api.generateDraft);
  const [{ fetching: markNotCustomerLoading }, markNotCustomer] = useGlobalAction(api.markNotCustomer);
  const [{ fetching: assigningQuick }, updateConversation] = useAction(api.conversation.update);
  const currentUser = useUser(api, { select: { id: true, email: true } }) as any;
  const [{ data: configData }] = useFindFirst(api.appConfiguration);
  const telemetryEnabled = (configData as any)?.telemetryBannersEnabled ?? true;
  const [{ data: aiCommentData, fetching: aiCommentFetching }] = useFindMany(api.aiComment, {
    pause: !selectedConvId,
    filter: {
      conversationId: { equals: selectedConvId ?? "" },
    },
    sort: { createdAt: "Descending" },
    first: 10,
    select: {
      id: true,
      kind: true,
      source: true,
      content: true,
      createdAt: true,
      model: true,
      batchOperation: { id: true },
      user: { id: true, email: true },
    },
  });
  const aiComments = aiCommentData as any[] | undefined;

  const setTelemetryEvent = (event: Omit<PageTelemetry, "at">) => {
    if (!telemetryEnabled) return;
    setTelemetry({ ...event, at: new Date().toISOString() });
  };

  const handleGenerateDraft = async (conversationId: string, regenerate = false) => {
    setGeneratingDraft(true);
    const start = Date.now();
    try {
      await generateDraft({ conversationId, regenerate });
      toast.success(regenerate ? "Draft regenerated!" : "Draft generated!");
      await refresh();
      setTriageRunBanner(`Auto-triage signal: draft ${regenerate ? "regenerated" : "generated"} at ${new Date().toLocaleTimeString()}.`);
      setTelemetryEvent({
        lastAction: regenerate ? "Draft regenerated" : "Draft generated",
        details: `Conversation ${conversationId}`,
        severity: "success",
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate draft");
      setTelemetryEvent({
        lastAction: regenerate ? "Draft regeneration failed" : "Draft generation failed",
        details: err?.message || String(err),
        severity: "error",
        durationMs: Date.now() - start,
      });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleAssignToMe = async (conversationId: string) => {
    if (!currentUser?.id) {
      toast.error("Current user unavailable");
      return;
    }
    try {
      await (updateConversation as any)({
        id: conversationId,
        assignedToUser: currentUser.id,
      });
      await refresh();
      toast.success("Assigned to me");
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign conversation");
    }
  };

  const handleResolveConversation = async (conversationId: string) => {
    try {
      await runBatchOperation({
        action: "resolve",
        conversationIds: JSON.stringify([conversationId]),
        emailIds: JSON.stringify([]),
        estimatedTimeSaved: 1,
      } as any);
      await refresh();
      toast.success("Conversation resolved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to resolve conversation");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const start = Date.now();
    let freshData: any[] | undefined;
    try {
      const result = await refresh();
      freshData = (result as any)?.data as any[] | undefined;

      // Prune selected email IDs that no longer exist in the refreshed data
      if (freshData) {
        const allEmailIds = new Set(
          freshData.map((c: any) => c?.messages?.edges?.[0]?.node?.id).filter(Boolean)
        );
        setSelectedEmailIds((prev) => prev.filter((id) => allEmailIds.has(id)));

        // Clear detail pane if selected conversation no longer exists or doesn't match filter
        if (selectedConvId && !freshData.find((c: any) => c.id === selectedConvId)) {
          setSelectedConvId(null);
        }
      }
      setTelemetryEvent({
        lastAction: "Queue refreshed",
        details: `${freshData?.length ?? conversations?.length ?? 0} conversations`,
        severity: "info",
        durationMs: Date.now() - start,
      });
      setTriageRunBanner(
        `Auto-triage status refreshed: ${freshData?.length ?? conversations?.length ?? 0} conversations checked at ${new Date().toLocaleTimeString()}.`
      );
      toast.success(`Refreshed list (${freshData?.length ?? conversations?.length ?? 0} items)`);
    } catch (err: any) {
      toast.error(`Refresh failed: ${err?.message || String(err)}`);
      setTelemetryEvent({
        lastAction: "Refresh failed",
        details: err?.message || String(err),
        severity: "error",
        durationMs: Date.now() - start,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const resetNotCustomerForm = () => {
    setNotCustomerReasonType("conversation_other");
    setNotCustomerPatternValue("");
    setNotCustomerReasonDetails("");
  };

  const reasonConfigByType: Record<
    string,
    { label: string; scope: string; placeholder: string; requiresPattern?: boolean }
  > = {
    sender_exact: {
      label: "Never allow this sender address",
      scope: "sender_exact",
      placeholder: "sender@example.com",
      requiresPattern: true,
    },
    sender_domain: {
      label: "Never allow this sender domain",
      scope: "sender_domain",
      placeholder: "@example.com",
      requiresPattern: true,
    },
    subject_keyword: {
      label: "Subject keyword pattern",
      scope: "subject_keyword",
      placeholder: "billing reminder, newsletter, promo",
      requiresPattern: true,
    },
    body_keyword: {
      label: "Body keyword pattern",
      scope: "body_keyword",
      placeholder: "unsubscribe, no-reply, do not reply",
      requiresPattern: true,
    },
    conversation_other: {
      label: "Conversation-specific reason",
      scope: "conversation",
      placeholder: "Optional pattern or clue",
    },
  };

  const buildNotCustomerReason = () => {
    const config = reasonConfigByType[notCustomerReasonType] ?? reasonConfigByType.conversation_other;
    const label = config.label;
    const parts = [label];
    if (notCustomerPatternValue.trim()) parts.push(`Pattern: ${notCustomerPatternValue.trim()}`);
    if (notCustomerReasonDetails.trim()) parts.push(`Notes: ${notCustomerReasonDetails.trim()}`);
    return parts.join(" | ");
  };

  const handleMarkNotCustomer = async () => {
    if (!selectedConvId) return;
    const reasonConfig = reasonConfigByType[notCustomerReasonType] ?? reasonConfigByType.conversation_other;
    if (reasonConfig.requiresPattern && !notCustomerPatternValue.trim()) {
      toast.error("Please enter a pattern/value for this reason type.");
      return;
    }
    setMarkNotCustomerDialogOpen(false);
    const currentIndex = filteredConversations?.findIndex((c: any) => c.id === selectedConvId) ?? -1;
    const selectedConversation = filteredConversations?.find((c: any) => c.id === selectedConvId);
    const reason = buildNotCustomerReason();
    try {
      await markNotCustomer({
        conversationId: selectedConvId,
        reason,
        reasonType: notCustomerReasonType,
        reasonScope: reasonConfig.scope,
        patternValue: notCustomerPatternValue.trim() || selectedConversation?.primaryCustomerEmail || "",
        reasonDetails: notCustomerReasonDetails.trim(),
      } as any);
      toast.success("Marked as Not a Customer");
      await refresh();
      const nextConv = filteredConversations?.[currentIndex + 1] ?? filteredConversations?.[currentIndex - 1];
      setSelectedConvId(nextConv?.id ?? null);
      resetNotCustomerForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as Not a Customer");
    }
  };

  const getPrimaryMessage = (conv: any): any => {
    const messages = conv?.messages?.edges?.map((e: any) => e?.node).filter(Boolean) || [];
    if (messages.length === 0) return null;
    // Sort by receivedDateTime descending (newest first)
    const sorted = [...messages].sort((a, b) => {
      const dateA = a.receivedDateTime ? new Date(a.receivedDateTime).getTime() : 0;
      const dateB = b.receivedDateTime ? new Date(b.receivedDateTime).getTime() : 0;
      return dateB - dateA;
    });
    return sorted[0];
  };

  const getPrimaryEmailId = (conv: any): string | null => {
    const primaryMsg = getPrimaryMessage(conv);
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

  const criticalCount = conversations?.filter((c: any) => c.currentPriorityBand === "urgent").length || 0;
  const totalQueue = conversations?.length || 0;

  const getPriorityLabel = (band: string | null | undefined) => {
    switch (band) {
      case "urgent": return "URGENT";
      case "high": return "HIGH";
      case "medium": return "MEDIUM";
      case "low": return "LOW";
      case "unclassified": return "UNCLASSIFIED";
      default: return "UNCLASSIFIED";
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

  const batchForModal = useMemo(() => {
    const emails =
      (conversations || [])
        .map((c: any) => {
          const primaryMsg = getPrimaryMessage(c);
          const emailId = primaryMsg?.id;
          if (!emailId) return null;

          const priority = c.currentPriorityBand === "urgent"
            ? "P1"
            : c.currentPriorityBand === "high"
              ? "P2"
              : c.currentPriorityBand === "medium"
                ? "P3"
                : "P4";
          const eligibility = evaluateDraftEligibility({
            selectedPlaybookId: c.selectedPlaybook?.id,
            selectedPlaybookConfidence: c.selectedPlaybookConfidence,
            isVerifiedCustomer: c.isVerifiedCustomer,
            shopifyOrderNumbers: c.shopifyOrderNumbers,
            primaryCustomerEmail: c.primaryCustomerEmail,
          });

          return {
            id: emailId,
            conversationId: c.id,
            customerName: c.primaryCustomerName || "Unknown",
            customerEmail: c.primaryCustomerEmail || "unknown@example.com",
            orderId: getOrderNumbers(c)[0],
            priority: priority as "P1" | "P2" | "P3" | "P4",
            receivedAt: primaryMsg?.receivedDateTime || c.latestMessageAt || c.firstMessageAt || new Date().toISOString(),
            originalSubject: primaryMsg?.subject || c.subject || "(No subject)",
            originalBody: primaryMsg?.bodyPreview || "",
            aiResponse: c.aiDraftContent || "",
            hasDraft: !!c.aiDraftContent,
            draftEligible: eligibility.eligible,
            draftEligibilityReason: eligibility.reasons[0] || undefined,
            status: "pending" as const,
          };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null)
        .filter((e: any) => selectedEmailIds.includes(e.id)) || [];

    const selectedCount = selectedEmailIds.length;
    const loadedCount = emails.length;
    const label = selectedCount === loadedCount 
      ? `Selected (${selectedCount})`
      : `Selected (${loadedCount} of ${selectedCount} loaded)`;

    return {
      id: "batch-selected",
      type: "manual",
      label,
      emails,
      emailCount: emails.length,
      aiSuggestion: `Review and process ${emails.length} item(s).`,
      estimatedTimeSaved: emails.length * 3,
    };
  }, [conversations, selectedEmailIds]);
  const triageDraftPolicySummary = useMemo(() => {
    const blocked = (batchForModal.emails || [])
      .filter((e: any) => e?.draftEligible === false)
      .map((e: any) => ({
        id: e.id,
        subject: e.originalSubject || "(No subject)",
        reason: e.draftEligibilityReason || "Policy blocked",
      }));
    const eligible = Math.max((batchForModal.emails || []).length - blocked.length, 0);
    return { eligible, blocked };
  }, [batchForModal]);

  const showPendingOnly = activeTab === "pending";
  const showUrgentOnly = activeTab === "urgent";
  const showDueOnly = activeTab === "due";

  const filteredConversations =
    conversations
      ?.filter((c: any) => {
        if (showUrgentOnly && c.currentPriorityBand !== "urgent") return false;
        if (showPendingOnly && !c.requiresHumanReview) return false;
        if (showDueOnly) {
          const state = inferSlaState(c.timeRemaining, c.deadlineDate);
          if (state !== "at_risk" && state !== "breached") return false;
        }
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.subject?.toLowerCase().includes(q) ||
          c.primaryCustomerEmail?.toLowerCase().includes(q) ||
          c.primaryCustomerName?.toLowerCase().includes(q) ||
          getOrderNumbers(c).some((o) => o.toLowerCase().includes(q))
        );
      }) ?? [];

  const selectRelativeConversation = (offset: 1 | -1) => {
    if (filteredConversations.length === 0) return;
    if (!selectedConvId) {
      setSelectedConvId(filteredConversations[0]?.id || null);
      return;
    }
    const idx = filteredConversations.findIndex((c: any) => c.id === selectedConvId);
    const nextIdx = Math.min(
      Math.max((idx === -1 ? 0 : idx) + offset, 0),
      filteredConversations.length - 1
    );
    setSelectedConvId(filteredConversations[nextIdx]?.id || null);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "j") {
        event.preventDefault();
        selectRelativeConversation(1);
      } else if (event.key === "k") {
        event.preventDefault();
        selectRelativeConversation(-1);
      } else if (event.key === "g" && selectedConvId) {
        event.preventDefault();
        handleGenerateDraft(selectedConvId, Boolean(selectedConv?.aiDraftContent));
      } else if (event.key === "a" && selectedConvId) {
        event.preventDefault();
        handleAssignToMe(selectedConvId);
      } else if (event.key === "r" && selectedConvId) {
        event.preventDefault();
        handleResolveConversation(selectedConvId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filteredConversations, selectedConv?.aiDraftContent, selectedConvId]);

  const draftsPendingCount = conversations?.filter((c: any) => c.requiresHumanReview).length || 0;

  const loading = batchLoading || applyEditsLoading;
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedConvId(null), 300);
  };

  return (
    <div className="flex flex-1 min-h-0 bg-background text-foreground">
      <CustomerSupportSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Triage Queue"
          subtitle="Browse and search all emails with a flexible approach to triage"
          actions={
            <>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {draftsPendingCount} DRAFTS PENDING
              </Badge>

              {selectedEmailIds.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">
                    Draft policy: {triageDraftPolicySummary.eligible} eligible
                    {triageDraftPolicySummary.blocked.length > 0
                      ? ` • ${triageDraftPolicySummary.blocked.length} blocked`
                      : ""}
                  </span>
                  {triageDraftPolicySummary.blocked.length > 0 ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground">
                          Why blocked?
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-96 bg-card border-border">
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-foreground">Blocked by draft policy</div>
                          <div className="space-y-1 max-h-56 overflow-auto">
                            {triageDraftPolicySummary.blocked.slice(0, 8).map((b) => (
                              <div key={b.id} className="rounded-md border border-border bg-muted/40 px-2 py-1.5">
                                <div className="text-[11px] font-medium text-foreground truncate">{b.subject}</div>
                                <div className="text-[11px] text-muted-foreground">{b.reason}</div>
                              </div>
                            ))}
                            {triageDraftPolicySummary.blocked.length > 8 ? (
                              <div className="text-[10px] text-muted-foreground">
                                +{triageDraftPolicySummary.blocked.length - 8} more blocked item(s)
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                  <SecondaryButton
                    onClick={() => {
                      const validEmails = batchForModal.emails.length;
                      if (validEmails === 0) {
                        toast.error("No valid emails found in selection");
                        return;
                      }
                      setBatchModalOpen(true);
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Batch Actions ({selectedEmailIds.length})
                  </SecondaryButton>
                </>
              )}

              <SecondaryButton onClick={handleRefresh} disabled={isRefreshing || fetching}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing || fetching ? "animate-spin" : ""}`} />
                {isRefreshing || fetching ? "Refreshing..." : "Refresh"}
              </SecondaryButton>
            </>
          }
        />

        {telemetryEnabled && telemetry && (
          <div className="px-8 pt-4">
            <TelemetryBanner telemetry={telemetry} onDismiss={() => setTelemetry(null)} />
          </div>
        )}

        {triageRunBanner && (
          <div className="px-8 pt-4">
            <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
              {triageRunBanner}
            </div>
          </div>
        )}

        <StatusBar />

        {/* Search Bar */}
        <div className="px-8 py-4 border-b border-border flex-shrink-0">
          <Input
            placeholder="Search by customer, order ID, subject, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card border-border"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="px-8 pb-8">
            <div className="pt-6">
              <ListSectionHeader
                title="Triage Queue"
                subtitle="High-signal queue for rapid classification"
                count={filteredConversations.length}
              />
            </div>
            {/* Quick Filters */}
            <div className="mt-4 flex gap-2 p-4 border border-border bg-muted/30 rounded-xl">
              <Button
                variant={activeTab === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("all")}
                className={activeTab === "all" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}
              >
                ALL ({totalQueue})
              </Button>

              <Button
                variant={activeTab === "urgent" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("urgent")}
                className={activeTab === "urgent" ? "bg-destructive hover:bg-destructive/90 text-foreground" : ""}
              >
                URGENT ({criticalCount})
              </Button>

              <Button
                variant={activeTab === "pending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("pending")}
                className={activeTab === "pending" ? "bg-amber-500 hover:bg-amber-600 text-primary-foreground" : "text-muted-foreground"}
              >
                PENDING
              </Button>
              <Button
                variant={activeTab === "due" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("due")}
                className={activeTab === "due" ? "bg-red-600 hover:bg-red-700 text-white" : "text-muted-foreground"}
              >
                DUE / OVERDUE
              </Button>
              <span className="ml-auto self-center text-[11px] text-muted-foreground">
                Shortcuts: J/K move • G draft • A assign me • R resolve
              </span>
            </div>

            {/* Conversation List */}
            <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card/30 overflow-hidden">
              {filteredConversations.length === 0 && (
                <EmptyState
                  title="No conversations to triage"
                  description="Try adjusting the filters or refresh the queue."
                  actionLabel="Refresh"
                  onAction={handleRefresh}
                />
              )}

              {filteredConversations.map((conv: any) => {
                const emailId = getPrimaryEmailId(conv);
                const checked = !!emailId && selectedEmailIds.includes(emailId);

                return (
                  <div
                    key={conv.id}
                    className={`p-4 hover:bg-muted/40 transition-colors ${
                      selectedConvId === conv.id ? "bg-primary/5 border-l-2 border-primary" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Checkbox column */}
                      <div className="flex items-start pt-0.5 flex-shrink-0">
                        <Checkbox
                          checked={checked}
                          disabled={!emailId}
                          onCheckedChange={(v) => {
                            if (!emailId) return;
                            handleToggleEmailSelection(emailId, !!v);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        />
                      </div>

                      {/* Content column */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          setSelectedConvId(conv.id);
                          setDrawerOpen(true);
                        }}
                      >
                        {/* Row 1: Priority + Subject + Alert */}
                        <div className="flex items-start gap-2 mb-2">
                          <UnifiedBadge type={conv.currentPriorityBand} label={getPriorityLabel(conv.currentPriorityBand)} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{conv.subject || "(No subject)"}</div>
                          </div>
                          {conv.requiresHumanReview && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                        </div>

                        {/* Row 2: Customer */}
                        <div className="text-sm text-muted-foreground truncate mb-2 flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {conv.primaryCustomerEmail || conv.primaryCustomerName || "Unknown"}
                        </div>

                        {/* Row 3: Sentiment + Time + Order */}
                        <div className="flex items-center gap-2 text-xs">
                          <SentimentBadge sentiment={conv.sentiment} />
                          <Separator orientation="vertical" className="h-4" />
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{formatTime(conv.latestMessageAt)}</span>
                          <Separator orientation="vertical" className="h-4" />
                          <UnifiedBadge
                            type={slaStateToBadge(inferSlaState(conv.timeRemaining, conv.deadlineDate))}
                            label={formatSlaLabel(conv.timeRemaining, conv.deadlineDate)}
                          />

                          {getOrderNumbers(conv).length > 0 && (
                            <>
                              <Separator orientation="vertical" className="h-4" />
                              <Tag className="h-3 w-3 text-primary" />
                              <span className="text-primary">{getOrderNumbers(conv)[0]}</span>
                            </>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5">
                            Playbook: {conv.selectedPlaybook?.scenarioKey || conv.selectedPlaybook?.name || "none"}
                            {typeof conv.selectedPlaybookConfidence === "number"
                              ? ` (${conv.selectedPlaybookConfidence.toFixed(2)})`
                              : ""}
                          </span>
                          {(() => {
                            const changed = readSelectionMeta(conv.playbookSelectionMetaJson)?.changed;
                            const hasChanged =
                              changed?.selectedPlaybook || changed?.draftStatus || changed?.category || changed?.priorityBand;
                            return hasChanged ? (
                              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5">changed</span>
                            ) : null;
                          })()}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateDraft(conv.id, Boolean(conv.aiDraftContent));
                            }}
                            disabled={generatingDraft}
                          >
                            {conv.aiDraftContent ? "Regenerate" : "Draft"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignToMe(conv.id);
                            }}
                            disabled={assigningQuick}
                          >
                            Assign me
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolveConversation(conv.id);
                            }}
                            disabled={batchLoading}
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={(open) => !open && handleCloseDrawer()} direction="right">
        <DrawerContent direction="right" hideHandle className="w-full sm:max-w-2xl bg-card border-border overflow-y-auto p-0">
          <div className="border-b border-border bg-card/50 px-6 py-5 sticky top-0 z-10">
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle className="text-xl font-semibold text-foreground">Triage Details</DrawerTitle>
                {selectedConv?.subject && <p className="text-sm text-muted-foreground mt-1 line-clamp-1 pr-8">{selectedConv.subject}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseDrawer} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {!selectedConv ? (
              <div className="text-sm text-muted-foreground">Select a conversation to view details.</div>
            ) : (
              <>
                {/* Conversation Header */}
                <div>
                  <h2 className="text-xl font-semibold mb-2">{selectedConv.subject || "(No subject)"}</h2>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{selectedConv.primaryCustomerName || selectedConv.primaryCustomerEmail || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{selectedConv.primaryCustomerEmail || "—"}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-border hover:bg-muted hover:border-amber-500/50 text-amber-500"
                      onClick={() => setMarkNotCustomerDialogOpen(true)}
                      disabled={markNotCustomerLoading}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Mark Not a Customer
                    </Button>
                  </div>
                </div>

                {/* Original Message */}
                <Card className="bg-card border-border p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">ORIGINAL MESSAGE</h3>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {firstMessage?.bodyPreview || "No message content available"}
                  </div>
                </Card>

                {/* AI-Generated Response */}
                <Card className="bg-card border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      AI-GENERATED RESPONSE
                    </h3>
                  </div>

                  {selectedConv.aiDraftContent ? (
                    <>
                      <div className="text-sm leading-relaxed bg-muted/40 p-4 rounded-lg border border-border mb-4 whitespace-pre-wrap">
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
                          className="flex-1 border-border hover:bg-muted"
                          onClick={() => handleGenerateDraft(selectedConv.id, true)}
                          disabled={generatingDraft}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${generatingDraft ? "animate-spin" : ""}`} />
                          {generatingDraft ? "Regenerating..." : "Regenerate"}
                        </Button>

                        <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
                          <Send className="h-4 w-4 mr-2" />
                          Send Draft
                        </Button>

                        <Button variant="outline" className="border-border hover:bg-muted">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <Button
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
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
                      {generatingDraft && (
                        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-11/12" />
                          <Skeleton className="h-4 w-10/12" />
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Activity Timeline */}
                <Card className="bg-card border-border p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">ACTIVITY TIMELINE</h3>
                    <span className="text-xs text-muted-foreground">
                      {aiCommentFetching ? "Loading..." : `${aiComments?.length ?? 0} entries`}
                    </span>
                  </div>

                  {aiCommentFetching ? (
                    <div className="text-sm text-muted-foreground">Loading activity...</div>
                  ) : aiComments && aiComments.length > 0 ? (
                    <div className="space-y-3">
                      {aiComments.map((comment) => {
                        const style = getAiCommentStyle(comment.kind);
                        const createdAtLabel = comment.createdAt
                          ? new Date(comment.createdAt).toLocaleString()
                          : "Unknown";
                        const batchId = comment.batchOperation?.id;
                        const sourceLabel = comment.source || "system";
                        const userLabel = comment.user?.email;
                        return (
                          <div
                            key={comment.id}
                            className="rounded-lg border border-border bg-muted/40 p-3"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}
                                >
                                  <style.Icon className="h-3 w-3" />
                                  {style.label}
                                </span>
                                {batchId && (
                                  <RouterLink
                                    to={`/customer/support/triage/history?batch=${batchId}`}
                                    className="text-[11px] text-primary hover:text-primary/80"
                                  >
                                    Batch {batchId}
                                  </RouterLink>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground" title={createdAtLabel}>
                                {timeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {comment.content}
                            </div>
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              Source: {sourceLabel}
                              {userLabel ? ` · ${userLabel}` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No activity logged yet.</div>
                  )}
                </Card>

                <Card className="bg-card border-border p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">SLA & Verification</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <UnifiedBadge
                        type={slaStateToBadge(inferSlaState(selectedConv.timeRemaining, selectedConv.deadlineDate))}
                        label={formatSlaLabel(selectedConv.timeRemaining, selectedConv.deadlineDate)}
                      />
                      {selectedConv.slaTarget ? (
                        <span className="text-xs text-muted-foreground">Target: {selectedConv.slaTarget}</span>
                      ) : null}
                    </div>
                    {selectedConv.deadlineDate ? (
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(selectedConv.deadlineDate).toLocaleString()}
                      </div>
                    ) : null}
                    <Separator className="bg-border" />
                    <div className="flex items-center gap-2">
                      <UnifiedBadge
                        type={selectedConv.isVerifiedCustomer ? "connected" : "warning"}
                        label={selectedConv.isVerifiedCustomer ? "Verified customer" : "Unverified customer"}
                      />
                      <span className="text-xs text-muted-foreground">
                        Confidence: {typeof selectedConv.customerConfidenceScore === "number" ? `${selectedConv.customerConfidenceScore}%` : "—"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Shopify customer: {selectedConv.shopifyCustomerId || "Not linked"}
                    </div>
                    {Array.isArray(selectedConv.shopifyOrderNumbers) && selectedConv.shopifyOrderNumbers.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedConv.shopifyOrderNumbers.slice(0, 6).map((orderId: string) => (
                          <span
                            key={orderId}
                            className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground"
                          >
                            {orderId}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card className="bg-card border-border p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Confidence & Why</h3>
                  {(() => {
                    const meta = readSelectionMeta(selectedConv.playbookSelectionMetaJson);
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <UnifiedBadge
                            type="connected"
                            label={`Playbook ${selectedConv.selectedPlaybook?.scenarioKey || "none"}`}
                          />
                          <span className="text-xs text-muted-foreground">
                            Confidence: {typeof selectedConv.selectedPlaybookConfidence === "number"
                              ? selectedConv.selectedPlaybookConfidence.toFixed(2)
                              : "—"}
                          </span>
                        </div>
                        {meta?.reason ? (
                          <div className="text-xs text-muted-foreground">Reason: {String(meta.reason)}</div>
                        ) : null}
                        {meta?.signals ? (
                          <details className="rounded-lg border border-border bg-muted/30 p-2">
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                              Signals evaluated
                            </summary>
                            <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                              {JSON.stringify(meta.signals, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                        {meta?.evidence ? (
                          <details className="rounded-lg border border-border bg-muted/30 p-2">
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                              Evidence snippets
                            </summary>
                            <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                              {JSON.stringify(meta.evidence, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                        {!meta ? (
                          <div className="text-xs text-muted-foreground">No selection metadata recorded yet.</div>
                        ) : null}
                      </div>
                    );
                  })()}
                </Card>

                <ConversationActionPanel
                  conversation={selectedConv}
                  onUpdated={async () => {
                    await refresh();
                  }}
                />
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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
          const start = Date.now();
          try {
            await applyDraftEdits({
              emailIds: JSON.stringify(emailIds),
              draftsByEmailId: JSON.stringify(draftsByEmailId),
            });
            await runBatchOperation({
              batchId,
              action: "send",
              emailIds: JSON.stringify(emailIds),
              conversationIds: JSON.stringify([]),
              estimatedTimeSaved: (emailIds?.length || 0) * 3,
            });
            toast.success(`Queued send for ${emailIds.length} item(s)`);
            setTelemetryEvent({
              lastAction: "Batch send queued",
              details: `${emailIds.length} item(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Send failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch send failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onSaveDrafts={async (emailIds, batchId, draftsByEmailId) => {
          const start = Date.now();
          try {
            await applyDraftEdits({
              emailIds: JSON.stringify(emailIds),
              draftsByEmailId: JSON.stringify(draftsByEmailId),
            });
            await runBatchOperation({
              batchId,
              action: "save_drafts",
              emailIds: JSON.stringify(emailIds),
              conversationIds: JSON.stringify([]),
              estimatedTimeSaved: (emailIds?.length || 0) * 3,
            });
            toast.success(`Saved ${emailIds.length} draft(s)`);
            setTelemetryEvent({
              lastAction: "Batch drafts saved",
              details: `${emailIds.length} draft(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Save drafts failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch save drafts failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onResolveAll={async (emailIds, batchId) => {
          const start = Date.now();
          try {
            await runBatchOperation({
              batchId,
              action: "resolve",
              emailIds: JSON.stringify(emailIds),
              conversationIds: JSON.stringify([]),
              estimatedTimeSaved: (emailIds?.length || 0) * 1,
            });
            toast.success(`Resolved ${emailIds.length} item(s)`);
            setTelemetryEvent({
              lastAction: "Batch resolved",
              details: `${emailIds.length} item(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Resolve failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch resolve failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onArchiveAll={async (emailIds, batchId) => {
          const start = Date.now();
          try {
            await runBatchOperation({
              batchId,
              action: "archive",
              emailIds: JSON.stringify(emailIds),
              conversationIds: JSON.stringify([]),
              estimatedTimeSaved: (emailIds?.length || 0) * 1,
            });
            toast.success(`Archived ${emailIds.length} item(s)`);
            setTelemetryEvent({
              lastAction: "Batch archived",
              details: `${emailIds.length} item(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Archive failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch archive failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onRejectAll={async (emailIds, batchId) => {
          const start = Date.now();
          try {
            await runBatchOperation({
              batchId,
              action: "reject",
              emailIds: JSON.stringify(emailIds),
              conversationIds: JSON.stringify([]),
              rejectReason: "Rejected in batch review",
              estimatedTimeSaved: 0,
            });
            toast.success(`Rejected ${emailIds.length} item(s)`);
            setTelemetryEvent({
              lastAction: "Batch rejected",
              details: `${emailIds.length} item(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Reject failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch reject failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onAssignAll={async (emailIds, batchId, assignId) => {
          const start = Date.now();
          try {
            await runBatchOperation({
              batchId,
              action: "assign",
              emailIds: JSON.stringify(emailIds),
              conversationIds: JSON.stringify([]),
              assignToUserId: assignId,
              estimatedTimeSaved: 0,
            });
            toast.success(`Assigned ${emailIds.length} item(s)`);
            setTelemetryEvent({
              lastAction: "Batch assigned",
              details: `${emailIds.length} item(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Assign failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch assign failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onMoveAll={async (emailIds, batchId, category) => {
          const start = Date.now();
          try {
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
            setTelemetryEvent({
              lastAction: "Batch moved",
              details: `${emailIds.length} item(s)`,
              severity: "success",
              durationMs: Date.now() - start,
            });
            setBatchModalOpen(false);
            setSelectedEmailIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Move failed: " + (error?.message || error));
            setTelemetryEvent({
              lastAction: "Batch move failed",
              details: error?.message || String(error),
              severity: "error",
              durationMs: Date.now() - start,
            });
          }
        }}
        onRegenerateResponse={async (emailId) => {
          const conv = (conversations || []).find((c: any) => getPrimaryEmailId(c) === emailId);
          if (!conv?.id) return "Regenerated";
          await handleGenerateDraft(conv.id, true);
          return "Regenerated";
        }}
      />

      <AlertDialog
        open={markNotCustomerDialogOpen}
        onOpenChange={(open) => {
          setMarkNotCustomerDialogOpen(open);
          if (!open) resetNotCustomerForm();
        }}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Not a Customer?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This removes it from triage. You can undo this in Triage History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Reason type</label>
              <select
                value={notCustomerReasonType}
                onChange={(e) => setNotCustomerReasonType(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="sender_exact">Never allow sender address</option>
                <option value="sender_domain">Never allow sender domain</option>
                <option value="subject_keyword">Subject keyword pattern</option>
                <option value="body_keyword">Body keyword pattern</option>
                <option value="conversation_other">Conversation-specific reason</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Pattern/email/keywords (optional)</label>
              <Input
                value={notCustomerPatternValue}
                onChange={(e) => setNotCustomerPatternValue(e.target.value)}
                placeholder={(reasonConfigByType[notCustomerReasonType] ?? reasonConfigByType.conversation_other).placeholder}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <textarea
                value={notCustomerReasonDetails}
                onChange={(e) => setNotCustomerReasonDetails(e.target.value)}
                placeholder="Why should this be treated as not a customer?"
                className="min-h-[92px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkNotCustomer}
              className="bg-amber-500 hover:bg-amber-600 text-primary-foreground"
              disabled={markNotCustomerLoading}
            >
              {markNotCustomerLoading ? "Marking..." : "Mark Not a Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
