import { useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { useFindMany, useFindFirst, useGlobalAction } from "@gadgetinc/react";
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
import TelemetryBanner, { type PageTelemetry } from "@/components/TelemetryBanner";
import { StatusBar } from "@/components/StatusBar";
import { getAiCommentStyle } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
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
  MessageSquare,
  Layers,
  ShieldAlert,
  FileText,
  PenLine,
  Settings,
  UserX,
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

// ── Customer Sidebar ────────────────────────────────────────────────
const BASE = "/customer/support";
const customerTabs = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard, path: BASE },
  { id: "conversations", label: "Conversations", icon: MessageSquare,   path: `${BASE}/conversations` },
  { id: "threads",       label: "Threads",       icon: MessageSquare,   path: `${BASE}/threads` },
  { id: "triage",        label: "Triage",        icon: Layers,          path: `${BASE}/triage` },
  { id: "quarantine",    label: "Quarantine",    icon: ShieldAlert,     path: `${BASE}/quarantine` },
  { id: "templates",     label: "Templates",     icon: FileText,        path: `${BASE}/templates`,
    children: [
      { id: "templates-list", label: "Templates",  icon: FileText, path: `${BASE}/templates` },
      { id: "signatures",     label: "Signatures", icon: PenLine,  path: `${BASE}/signatures` },
    ],
  },
  { id: "settings",      label: "Settings",      icon: Settings,        path: `${BASE}/settings` },
];

function CustomerSidebar({ currentPath }: { currentPath: string }) {
  const [{ data: quarantineData }] = useFindMany(api.emailQuarantine, {
    filter: { status: { equals: "pending_review" } },
    select: { id: true },
    first: 200,
  });
  const quarantineCount = (quarantineData as any[] | undefined)?.length ?? 0;

  const isActive = (path: string, children?: { path: string }[]) => {
    if (path === BASE) return currentPath === BASE || currentPath === BASE + "/";
    if (children) {
      return children.some((child) => currentPath === child.path || currentPath.startsWith(child.path + "/"));
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6 px-3">
        <h2 className="text-lg font-semibold text-white leading-tight">CUSTOMER</h2>
        <p className="text-xs text-slate-400">Support</p>
      </div>
      <nav className="space-y-1">
        {customerTabs.map(({ id, label, icon: Icon, path, children }) => (
          <div key={id}>
            <RouterLink
              to={children ? children[0].path : path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(path, children)
                  ? "bg-teal-600/10 text-teal-400 font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{label}</span>
              {id === "quarantine" && quarantineCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold">
                  {quarantineCount}
                </span>
              )}
            </RouterLink>
            {children && (
              <div className="ml-7 mt-1 space-y-1 border-l border-slate-800 pl-3">
                {children.map((child) => (
                  <RouterLink
                    key={child.id}
                    to={child.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm ${
                      currentPath === child.path || currentPath.startsWith(child.path + "/")
                        ? "text-teal-400 font-medium"
                        : "text-slate-500 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <child.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{child.label}</span>
                  </RouterLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function TriageQueuePage() {
  const location = useLocation();
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "urgent" | "pending" | "due" | "starred">("all");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [telemetry, setTelemetry] = useState<PageTelemetry | null>(null);

  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [assignToUserId, setAssignToUserId] = useState("");
  const [moveToCategory, setMoveToCategory] = useState("");
  const [markNotCustomerDialogOpen, setMarkNotCustomerDialogOpen] = useState(false);

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

  const handleMarkNotCustomer = async () => {
    if (!selectedConvId) return;
    setMarkNotCustomerDialogOpen(false);
    const currentIndex = filteredConversations?.findIndex((c: any) => c.id === selectedConvId) ?? -1;
    try {
      await markNotCustomer({ conversationId: selectedConvId, reason: "" });
      toast.success("Marked as Not a Customer");
      await refresh();
      const nextConv = filteredConversations?.[currentIndex + 1] ?? filteredConversations?.[currentIndex - 1];
      setSelectedConvId(nextConv?.id ?? null);
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
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Triage Queue"
          subtitle="Browse and search all emails with a flexible approach to triage"
          actions={
            <>
              <Badge variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {draftsPendingCount} DRAFTS PENDING
              </Badge>

              {selectedEmailIds.length > 0 && (
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

        <StatusBar />

        {/* Search Bar */}
        <div className="px-8 py-4 border-b border-slate-800 flex-shrink-0">
          <Input
            placeholder="Search by customer, order ID, subject, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
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
                    className={`p-4 hover:bg-slate-900/50 transition-colors ${
                      selectedConvId === conv.id ? "bg-slate-900/80 border-l-2 border-teal-500" : ""
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
                          className="border-slate-600 data-[state=checked]:border-teal-500 data-[state=checked]:bg-teal-500"
                        />
                      </div>

                      {/* Content column */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedConvId(conv.id)}>
                        {/* Row 1: Priority + Subject + Alert */}
                        <div className="flex items-start gap-2 mb-2">
                          <UnifiedBadge type={conv.currentPriorityBand} label={getPriorityLabel(conv.currentPriorityBand)} />
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{conv.subject || "(No subject)"}</div>
                          </div>
                          {conv.requiresHumanReview && <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                        </div>

                        {/* Row 2: Customer */}
                        <div className="text-sm text-slate-400 truncate mb-2 flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {conv.primaryCustomerEmail || conv.primaryCustomerName || "Unknown"}
                        </div>

                        {/* Row 3: Sentiment + Time + Order */}
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
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 hover:bg-slate-800 hover:border-amber-500/50 text-amber-400"
                      onClick={() => setMarkNotCustomerDialogOpen(true)}
                      disabled={markNotCustomerLoading}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Mark Not a Customer
                    </Button>
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

                {/* Activity Timeline */}
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-300">ACTIVITY TIMELINE</h3>
                    <span className="text-xs text-slate-500">
                      {aiCommentFetching ? "Loading..." : `${aiComments?.length ?? 0} entries`}
                    </span>
                  </div>

                  {aiCommentFetching ? (
                    <div className="text-sm text-slate-500">Loading activity...</div>
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
                                {batchId && (
                                  <RouterLink
                                    to={`/customer/support/triage/history?batch=${batchId}`}
                                    className="text-[11px] text-teal-400 hover:text-teal-300"
                                  >
                                    Batch {batchId}
                                  </RouterLink>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500" title={createdAtLabel}>
                                {timeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300 whitespace-pre-wrap">
                              {comment.content}
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              Source: {sourceLabel}
                              {userLabel ? ` · ${userLabel}` : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">No activity logged yet.</div>
                  )}
                </Card>
              </div>
            )}
          </div>
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

      <AlertDialog open={markNotCustomerDialogOpen} onOpenChange={setMarkNotCustomerDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as Not a Customer?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This removes it from triage. You can undo this in Triage History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMarkNotCustomer}
              className="bg-amber-500 hover:bg-amber-600 text-black"
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
