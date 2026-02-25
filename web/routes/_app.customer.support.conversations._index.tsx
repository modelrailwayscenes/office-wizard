import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { AutoTable } from "@/components/auto";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGlobalAction, useFindOne, useFindMany, useFindFirst, useUser } from "@gadgetinc/react";
import { useConversationsListQuery, useInvalidateConversations } from "@/hooks/useConversationsQuery";
import { toast } from "sonner";
import { RefreshCw, Search, X, Mail, Paperclip, AlertTriangle, MessageSquare, Layers, FileText, PenLine, Settings, LayoutDashboard, CircleHelp, ShieldAlert, UserX } from "lucide-react";
import { SentimentBadge } from "@/components/SentimentBadge";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { format } from "date-fns";
import TelemetryBanner, { type PageTelemetry } from "@/components/TelemetryBanner";
import { StatusBar } from "@/components/StatusBar";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton, PrimaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
import { getAiCommentStyle } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";
import { ConversationDetailContent } from "@/components/ConversationDetailContent";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";

// ── Main Page ───────────────────────────────────────────────────────
export default function ConversationsIndex() {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [workFilter, setWorkFilter] = useState<string>("all");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<PageTelemetry | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [{ fetching: fetchingEmails }, fetchEmails] = useGlobalAction(api.fetchEmails);
  const [{ fetching: rebuildingConversations }, rebuildConversations] = useGlobalAction(api.rebuildConversations);
  const [{ fetching: markNotCustomerLoading }, markNotCustomer] = useGlobalAction(api.markNotCustomer);
  const [markNotCustomerDialogOpen, setMarkNotCustomerDialogOpen] = useState(false);
  const [notCustomerReasonType, setNotCustomerReasonType] = useState("conversation_other");
  const [notCustomerPatternValue, setNotCustomerPatternValue] = useState("");
  const [notCustomerReasonDetails, setNotCustomerReasonDetails] = useState("");
  const [{ data: configData }] = useFindFirst(api.appConfiguration);
  const currentUser = useUser(api, { select: { id: true, email: true, roleList: { key: true } } }) as any;
  const telemetryEnabled = (configData as any)?.telemetryBannersEnabled ?? true;
  const triageDebugModeEnabled = Boolean((configData as any)?.debugModeEnabled) || import.meta.env.DEV;

  const [{ data: latestTriageRun }] = useFindMany(api.conversation, {
    first: 1,
    sort: { lastTriagedAt: "Descending" } as any,
    filter: { lastTriagedAt: { isSet: true } } as any,
    select: { id: true, lastTriagedAt: true } as any,
  });

  const setTelemetryEvent = (event: Omit<PageTelemetry, "at">) => {
    if (!telemetryEnabled) return;
    setTelemetry({ ...event, at: new Date().toISOString() });
  };

  const listFilter = useMemo(() => {
    const filters: any[] = [];
    if (statusFilter !== "all") filters.push({ status: { equals: statusFilter } });
    if (priorityFilter !== "all") filters.push({ currentPriorityBand: { equals: priorityFilter } });
    if (workFilter === "urgent") filters.push({ currentPriorityBand: { equals: "urgent" } });
    if (workFilter === "drafts_ready") filters.push({ hasDraft: { equals: true } });
    if (workFilter === "overdue") filters.push({ hasDeadline: { equals: true } });
    if (workFilter === "unassigned") filters.push({ assignedToUser: { isSet: false } });
    if (workFilter === "assigned_to_me" && currentUser?.id) {
      filters.push({ assignedToUser: { id: { equals: currentUser.id } } });
    }
    if (search.trim()) {
      filters.push({
        OR: [
          { subject: { matches: search } },
          { primaryCustomerName: { matches: search } },
          { primaryCustomerEmail: { matches: search } },
          { orderValue: { matches: search } },
        ],
      });
    }
    if (filters.length === 0) return undefined;
    if (filters.length === 1) return filters[0];
    return { AND: filters };
  }, [priorityFilter, search, statusFilter, workFilter, currentUser?.id]);

  const { data: conversationListResult, isLoading: fetchingList } = useConversationsListQuery({
    filter: listFilter,
    first: 100,
    select: { id: true },
  });
  const conversationListData = conversationListResult as { id: string }[] | undefined;

  const [{ data: rawConversationData, fetching: fetchingConversation, error: conversationError }] = useFindOne(
    api.conversation,
    selectedConversationId ?? "",
    {
      pause: !selectedConversationId,
      select: {
        id: true,
        subject: true,
        primaryCustomerEmail: true,
        primaryCustomerName: true,
        status: true,
        currentPriorityBand: true,
        currentPriorityScore: true,
        sentiment: true,
        messageCount: true,
        firstMessageAt: true,
        latestMessageAt: true,
        resolvedAt: true,
        internalNotes: true,
        currentCategory: true,
        classifications: {
          edges: {
            node: {
              id: true,
              intentCategory: true,
              sentimentLabel: true,
              automationTag: true,
              createdAt: true,
            },
          },
        },
      },
    }
  );
  const conversationData = rawConversationData as any;

  const [{ data: rawMessagesData, fetching: fetchingMessages }] = useFindMany(
    api.emailMessage,
    {
      pause: !selectedConversationId,
      filter: {
        conversationId: { equals: selectedConversationId ?? "" },
      },
      sort: { receivedDateTime: "Ascending" },
      select: {
        id: true,
        subject: true,
        fromAddress: true,
        fromName: true,
        bodyPreview: true,
        bodyText: true,
        receivedDateTime: true,
        hasAttachments: true,
      },
    }
  );
  const messagesData = rawMessagesData as any[] | undefined;
  const [{ data: aiCommentData, fetching: fetchingAiComments }] = useFindMany(api.aiComment, {
    pause: !selectedConversationId,
    filter: {
      conversationId: { equals: selectedConversationId ?? "" },
    },
    sort: { createdAt: "Descending" },
    first: 1,
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
  const latestAiComment = (aiCommentData as any[] | undefined)?.[0];

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    try {
      const parsed = typeof date === "string" ? new Date(date) : date;
      return format(parsed, "dd MMM yyyy, HH:mm");
    } catch {
      return "—";
    }
  };

  const titleCaseEnum = (str: string | null | undefined) => {
    if (!str) return "—";
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const handleFetchEmails = async () => {
    const start = Date.now();
    try {
      const result = (await fetchEmails({
        unreadOnly: false,
        maxEmails: 100,
        maxPages: 10,
        runTriage: true,
      })) as any;
      invalidateConversations();
      const totalFetched = result?.sync?.totalFetched ?? 0;
      const imported = result?.sync?.imported ?? 0;
      const skipped = result?.sync?.skipped ?? 0;
      const errors = result?.sync?.errors ?? 0;
      if (totalFetched === 0 && imported === 0 && skipped === 0) {
        toast.warning("No emails returned from mailbox. Check Outlook connection and sync window.");
      } else {
        toast.success(`Fetched ${totalFetched} emails (${imported} imported, ${skipped} duplicates).`);
      }
      setLastRefreshedAt(new Date().toISOString());
      setTelemetryEvent({
        lastAction: "Emails fetched",
        details: `Fetched ${totalFetched}, imported ${imported}, duplicates ${skipped}, created ${result?.sync?.conversationsCreated ?? 0}, errors ${errors}`,
        severity: errors > 0 ? "warning" : "success",
        durationMs: Date.now() - start,
      });
    } catch (error) {
      toast.error(`Failed to fetch emails: ${error}`);
      setTelemetryEvent({
        lastAction: "Email fetch failed",
        details: String(error),
        severity: "error",
        durationMs: Date.now() - start,
      });
    }
  };

  const handleRebuildConversations = async () => {
    const start = Date.now();
    try {
      const result = await rebuildConversations({});
      invalidateConversations();
      const r = result as any;
      toast.success(`Rebuilt ${r?.created ?? 0} conversations (${r?.skipped ?? 0} skipped)`);
      setLastRefreshedAt(new Date().toISOString());
      setTelemetryEvent({
        lastAction: "Conversations rebuilt",
        details: `Created ${r?.created ?? 0}, skipped ${r?.skipped ?? 0}`,
        severity: "success",
        durationMs: Date.now() - start,
      });
    } catch (error) {
      toast.error(`Rebuild failed: ${error}`);
      setTelemetryEvent({
        lastAction: "Rebuild failed",
        details: String(error),
        severity: "error",
        durationMs: Date.now() - start,
      });
    }
  };

  const handleRowClick = (record: any) => {
    setSelectedConversationId(record.id);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedConversationId(null), 300);
  };

  const invalidateConversations = useInvalidateConversations();
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
    if (!selectedConversationId) return;
    const reasonConfig = reasonConfigByType[notCustomerReasonType] ?? reasonConfigByType.conversation_other;
    if (reasonConfig.requiresPattern && !notCustomerPatternValue.trim()) {
      toast.error("Please enter a pattern/value for this reason type.");
      return;
    }
    setMarkNotCustomerDialogOpen(false);
    try {
      await markNotCustomer({
        conversationId: selectedConversationId,
        reason: buildNotCustomerReason(),
        reasonType: notCustomerReasonType,
        reasonScope: reasonConfig.scope,
        patternValue: notCustomerPatternValue.trim() || conversationData?.primaryCustomerEmail || "",
        reasonDetails: notCustomerReasonDetails.trim(),
      } as any);
      invalidateConversations();
      toast.success("Marked as Not a Customer");
      handleCloseDrawer();
      resetNotCustomerForm();
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as Not a Customer");
    }
  };

  const formatClassification = (category: string | null | undefined) => {
    if (!category) return "UNCLASSIFIED";
    return category.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").toUpperCase();
  };

  const getPriorityBadgeColor = (priority: string | null | undefined) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-primary/20 text-primary border-primary/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "unclassified": return "bg-muted/50 text-muted-foreground border-border";
      default: return "bg-muted/50 text-muted-foreground border-border";
    }
  };

  const getPriorityLabel = (priority: string | null | undefined) => {
    switch (priority) {
      case "urgent": return "URGENT";
      case "high": return "HIGH";
      case "medium": return "MEDIUM";
      case "low": return "LOW";
      case "unclassified": return "UNCLASSIFIED";
      default: return "UNCLASSIFIED";
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const cfg: Record<string, { label: string; color: string }> = {
      new:              { label: "NEW",              color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      in_progress:      { label: "IN PROGRESS",      color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      waiting_customer: { label: "WAITING CUSTOMER", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      waiting_internal: { label: "WAITING INTERNAL", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
      resolved:         { label: "RESOLVED",         color: "bg-green-500/20 text-green-400 border-green-500/30" },
      archived:         { label: "ARCHIVED",         color: "bg-muted/50 text-muted-foreground border-border" },
    };
    return cfg[status || ""] ?? { label: "UNKNOWN", color: "bg-muted/50 text-muted-foreground border-border" };
  };

  const buildFilter = () => listFilter;

  const handleRefreshList = async () => {
    invalidateConversations();
    setLastRefreshedAt(new Date().toISOString());
    toast.success("Conversation list refreshed");
  };

  useEffect(() => {
    if (!fetchingList && conversationListData && !hasLoaded) {
      setTelemetryEvent({
        lastAction: "Conversations refreshed",
        details: `${conversationListData.length} conversations`,
        severity: "info",
      });
      setHasLoaded(true);
    }
  }, [conversationListData, fetchingList, hasLoaded]);

  return (
    <div className="flex flex-1 min-h-0 bg-background text-foreground">
      <CustomerSupportSidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-background">
        <PageHeader
          title="Conversations"
          subtitle="View and manage all email conversations"
          actions={
            <>
              <SecondaryButton onClick={handleRefreshList}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh List
              </SecondaryButton>
              <SecondaryButton
                onClick={handleRebuildConversations}
                disabled={rebuildingConversations}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${rebuildingConversations ? "animate-spin" : ""}`} />
                {rebuildingConversations ? "Rebuilding..." : "Rebuild Conversations"}
              </SecondaryButton>
              <PrimaryButton onClick={handleFetchEmails} disabled={fetchingEmails}>
                <RefreshCw className={`mr-2 h-4 w-4 ${fetchingEmails ? "animate-spin" : ""}`} />
                {fetchingEmails ? "Fetching..." : "Fetch New Emails"}
              </PrimaryButton>
            </>
          }
        />

        {telemetryEnabled && telemetry && (
          <div className="px-8 pt-4">
            <TelemetryBanner telemetry={telemetry} onDismiss={() => setTelemetry(null)} />
          </div>
        )}

        {triageDebugModeEnabled && (
          <div className="px-8 pt-4">
            <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Dev instrumentation:</span>{" "}
              last auto-triage {timeAgo((latestTriageRun as any)?.[0]?.lastTriagedAt)} · conversations loaded {(conversationListData || []).length} · drafts generated in view {(conversationListData || []).length > 0 ? "check row markers" : "0"} · last sync {timeAgo((configData as any)?.lastSyncAt)}
            </div>
          </div>
        )}

        <StatusBar />

        {/* Content - Resizable list + detail on desktop */}
        <div className="flex-1 flex min-h-0 px-0 pb-0">
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            <ResizablePanel defaultSize={50} minSize={30} className="min-w-0">
        <div className="px-8 pb-8 h-full overflow-auto">
          <div className="mt-6 mb-4 flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "assigned_to_me", label: "Assigned to me" },
              { key: "unassigned", label: "Unassigned" },
              { key: "urgent", label: "Urgent" },
              { key: "drafts_ready", label: "Drafts ready" },
              { key: "overdue", label: "Overdue" },
            ].map((item) => (
              <Button
                key={item.key}
                variant={workFilter === item.key ? "default" : "outline"}
                size="sm"
                className={workFilter === item.key ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}
                onClick={() => setWorkFilter(item.key)}
              >
                {item.label}
              </Button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground self-center">
              Last refreshed: {timeAgo(lastRefreshedAt)}
            </span>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-3 mb-6">

            {/* Search bar */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by customer, order ID, subject, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 rounded-lg"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[175px] h-11 bg-muted/50 border-border text-muted-foreground rounded-lg">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_customer">Waiting Customer</SelectItem>
                <SelectItem value="waiting_internal">Waiting Internal</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[165px] h-11 bg-muted/50 border-border text-muted-foreground rounded-lg">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border text-foreground">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

          </div>

          {/* Conversations Table */}
          {conversationListData?.length === 0 ? (
            <EmptyState
              title="No conversations found"
              description="Try fetching new emails or adjust filters."
              actionLabel="Fetch New Emails"
              onAction={handleFetchEmails}
            />
          ) : (
            <div className="bg-muted/50 border border-border rounded-xl overflow-hidden">
              <AutoTable
                model={api.conversation}
                searchable={false}
                sort={{ currentPriorityScore: "Descending", latestMessageAt: "Descending" } as any}
                columns={[
                {
                  header: "Priority",
                  render: ({ record }) => (
                    <div className="py-1">
                      <UnifiedBadge
                        type={(record as any).currentPriorityBand}
                        label={getPriorityLabel((record as any).currentPriorityBand)}
                      />
                    </div>
                  ),
                },
                {
                  header: "Subject",
                  render: ({ record }) => (
                    <span className="truncate max-w-sm text-foreground text-sm font-medium">
                      {(record as any).subject || "—"}
                    </span>
                  ),
                },
                {
                  header: "Customer",
                  render: ({ record }) => (
                    <div className="text-sm">
                      <div className="text-foreground truncate">{(record as any).primaryCustomerName || "Unknown customer"}</div>
                      <div className="text-muted-foreground truncate">{(record as any).primaryCustomerEmail || "—"}</div>
                    </div>
                  ),
                },
                {
                  header: "Unread",
                  render: ({ record }) => (
                    <span className="text-muted-foreground text-sm">{(record as any).unreadCount ?? 0}</span>
                  ),
                },
                {
                  header: "Assignment",
                  render: ({ record }) => {
                    const assignee = (record as any).assignedToUser?.email || (record as any).assignedTo?.email;
                    return <span className="text-muted-foreground text-sm">{assignee || "Unassigned"}</span>;
                  },
                },
                {
                  header: "Draft",
                  render: ({ record }) => {
                    const draftState = (record as any).hasDraft
                      ? ((record as any).requiresHumanReview ? "Edited/Review" : "Ready")
                      : "None";
                    return (
                      <UnifiedBadge
                        type={(record as any).hasDraft ? "connected" : "disconnected"}
                        label={draftState}
                      />
                    );
                  },
                },
                {
                  header: "SLA",
                  render: ({ record }) => {
                    const status = (record as any).timeRemaining
                      ? ((record as any).timeRemaining?.toLowerCase?.().includes("overdue") ? "error" : "connected")
                      : "disconnected";
                    const label = (record as any).timeRemaining || "Not set";
                    return <UnifiedBadge type={status} label={label} />;
                  },
                },
                {
                  header: "Classification",
                  render: ({ record }) => {
                    const r = record as any;
                    const node = r.classifications?.edges?.[0]?.node;
                    const category = node?.intentCategory ?? r.currentCategory ?? null;
                    return (
                      <UnifiedBadge 
                        type={category} 
                        label={formatClassification(category)} 
                      />
                    );
                  },
                },
                {
                  header: "Sentiment",
                  render: ({ record }) => (
                    <SentimentBadge sentiment={(record as any).sentiment} />
                  ),
                },
                {
                  header: "Status",
                  render: ({ record }) => {
                    const s = getStatusBadge((record as any).status);
                    return (
                      <UnifiedBadge 
                        type={(record as any).status} 
                        label={s.label} 
                      />
                    );
                  },
                },
                {
                  header: "Messages",
                  render: ({ record }) => (
                    <span className="text-muted-foreground text-sm">{(record as any).messageCount ?? "—"}</span>
                  ),
                },
                {
                  header: "Last Activity",
                  render: ({ record }) => (
                    <span className="text-muted-foreground text-sm">
                      {(record as any).latestMessageAt
                        ? new Date((record as any).latestMessageAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  ),
                },
              ]}
              filter={buildFilter()}
              onClick={handleRowClick}
                select={{
                  id: true,
                  subject: true,
                  primaryCustomerEmail: true,
                  currentCategory: true,
                  currentPriorityBand: true,
                  currentPriorityScore: true,
                  unreadCount: true,
                  hasDraft: true,
                  timeRemaining: true,
                  hasDeadline: true,
                  deadlineDate: true,
                  assignedTo: { id: true, email: true },
                  assignedToUser: { id: true, email: true },
                  orderValue: true,
                  primaryCustomerName: true,
                  requiresHumanReview: true,
                  status: true,
                  messageCount: true,
                  latestMessageAt: true,
                  sentiment: true,
                  classifications: {
                    edges: {
                      node: {
                        id: true,
                        intentCategory: true,
                        sentimentLabel: true,
                        createdAt: true,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </div>
            </ResizablePanel>
            <ResizableHandle withHandle className="bg-muted data-[panel-group-direction=vertical]:hidden" />
            <ResizablePanel defaultSize={50} minSize={30} className="hidden lg:block min-w-0">
              {/* Desktop: inline detail panel */}
              <div className="h-full overflow-auto border-l border-border bg-card/30">
                {!selectedConversationId ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground p-8">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm font-medium">Select a conversation</p>
                    <p className="text-xs mt-1">Click a row to view details</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-foreground">Conversation Details</h2>
                      <Button variant="ghost" size="icon" onClick={handleCloseDrawer} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <ConversationDetailContent
                      conversationData={conversationData}
                      messagesData={messagesData}
                      latestAiComment={latestAiComment}
                      fetchingConversation={fetchingConversation}
                      fetchingMessages={fetchingMessages}
                      fetchingAiComments={fetchingAiComments}
                      conversationError={conversationError || null}
                      markNotCustomerLoading={markNotCustomerLoading}
                      formatDateTime={formatDateTime}
                      titleCaseEnum={titleCaseEnum}
                      onMarkNotCustomer={() => setMarkNotCustomerDialogOpen(true)}
                      conversationId={selectedConversationId!}
                    />
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Conversation Details Drawer - Mobile only (Vaul Drawer, hidden on lg via wrapper) */}
        <div className="lg:hidden">
        <Drawer open={drawerOpen} onOpenChange={(open) => !open && handleCloseDrawer()} direction="right">
          <DrawerContent direction="right" hideHandle className="w-full sm:max-w-2xl bg-card border-border overflow-y-auto p-0">
            <div className="border-b border-border bg-card/50 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <DrawerTitle className="text-xl font-semibold text-foreground">Conversation Details</DrawerTitle>
                  {conversationData?.subject && <p className="text-sm text-muted-foreground mt-1 line-clamp-1 pr-8">{conversationData.subject}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseDrawer} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="px-6 py-6">
              {selectedConversationId && (
                <ConversationDetailContent
                  conversationData={conversationData}
                  messagesData={messagesData}
                  latestAiComment={latestAiComment}
                  fetchingConversation={fetchingConversation}
                  fetchingMessages={fetchingMessages}
                  fetchingAiComments={fetchingAiComments}
                  conversationError={conversationError || null}
                  markNotCustomerLoading={markNotCustomerLoading}
                  formatDateTime={formatDateTime}
                  titleCaseEnum={titleCaseEnum}
                  onMarkNotCustomer={() => setMarkNotCustomerDialogOpen(true)}
                  conversationId={selectedConversationId}
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>
        </div>

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
    </div>
  );
}