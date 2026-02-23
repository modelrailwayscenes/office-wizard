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
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useGlobalAction, useFindOne, useFindMany, useFindFirst } from "@gadgetinc/react";
import { toast } from "sonner";
import { RefreshCw, Search, X, Mail, Paperclip, AlertTriangle, MessageSquare, Layers, FileText, PenLine, Settings, LayoutDashboard } from "lucide-react";
import { SentimentBadge } from "@/components/SentimentBadge";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { format } from "date-fns";
import TelemetryBanner, { type PageTelemetry } from "@/components/TelemetryBanner";
import { StatusBar } from "@/components/StatusBar";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton, PrimaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";

// ── Customer Sidebar (same as dashboard) ────────────────────────────
const customerTabs = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard, path: "/" },
  { id: "conversations", label: "Conversations", icon: MessageSquare,   path: "/conversations" },
  { id: "threads",       label: "Threads",       icon: MessageSquare,   path: "/threads" },
  { id: "triage",        label: "Triage",        icon: Layers,          path: "/triage" },
  { id: "templates",     label: "Templates",     icon: FileText,        path: "/templates",
    children: [
      { id: "templates-list", label: "Templates",  icon: FileText, path: "/templates" },
      { id: "signatures",     label: "Signatures", icon: PenLine,  path: "/signatures" },
    ],
  },
  { id: "settings",      label: "Settings",      icon: Settings,        path: "/settings" },
];

function CustomerSidebar({ currentPath }: { currentPath: string }) {
  const isActive = (path: string, children?: { path: string }[]) => {
    if (path === "/") return currentPath === "/";
    if (children) {
      return children.some((child) => currentPath === child.path || currentPath.startsWith(child.path + "/"));
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 flex-shrink-0">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white px-3">Customer</h2>
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
export default function ConversationsIndex() {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [telemetry, setTelemetry] = useState<PageTelemetry | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [{ fetching: fetchingEmails }, fetchEmails] = useGlobalAction(api.fetchEmails);
  const [{ fetching: rebuildingConversations }, rebuildConversations] = useGlobalAction(api.rebuildConversations);
  const [{ data: configData }] = useFindFirst(api.appConfiguration);
  const telemetryEnabled = (configData as any)?.telemetryBannersEnabled ?? true;

  const setTelemetryEvent = (event: Omit<PageTelemetry, "at">) => {
    if (!telemetryEnabled) return;
    setTelemetry({ ...event, at: new Date().toISOString() });
  };

  const listFilter = useMemo(() => {
    const filters: any[] = [];
    if (statusFilter !== "all") filters.push({ status: { equals: statusFilter } });
    if (priorityFilter !== "all") filters.push({ currentPriorityBand: { equals: priorityFilter } });
    if (search.trim()) {
      filters.push({
        OR: [
          { subject: { matches: search } },
          { primaryCustomerEmail: { matches: search } },
        ],
      });
    }
    if (filters.length === 0) return undefined;
    if (filters.length === 1) return filters[0];
    return { AND: filters };
  }, [priorityFilter, search, statusFilter]);

  const [{ data: conversationListData, fetching: fetchingList }] = useFindMany(api.conversation, {
    select: { id: true },
    filter: listFilter,
    first: 100,
  });

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
        unreadOnly: true,
        maxEmails: 100,
        maxPages: 10,
        runTriage: true,
      })) as any;
      toast.success("Emails fetched successfully");
      setTelemetryEvent({
        lastAction: "Emails fetched",
        details: `Fetched ${result?.sync?.totalFetched ?? 0}, imported ${result?.sync?.imported ?? 0}, duplicates ${result?.sync?.skipped ?? 0}, created ${result?.sync?.conversationsCreated ?? 0}, errors ${result?.sync?.errors ?? 0}`,
        severity: (result?.sync?.errors ?? 0) > 0 ? "warning" : "success",
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
      const r = result as any;
      toast.success(`Rebuilt ${r?.created ?? 0} conversations (${r?.skipped ?? 0} skipped)`);
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

  const formatClassification = (category: string | null | undefined) => {
    if (!category) return "UNCLASSIFIED";
    return category.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").toUpperCase();
  };

  const getPriorityBadgeColor = (priority: string | null | undefined) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-teal-500/20 text-teal-400 border-teal-500/30";
      case "low": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "unclassified": return "bg-slate-500/20 text-slate-400 border-slate-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
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
      archived:         { label: "ARCHIVED",         color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
    };
    return cfg[status || ""] ?? { label: "UNKNOWN", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
  };

  const buildFilter = () => listFilter;

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
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-slate-950">
        <PageHeader
          title="Conversations"
          subtitle="View and manage all email conversations"
          actions={
            <>
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

        <StatusBar />

        {/* Content */}
        <div className="px-8 pb-8">
          {/* Search + Filters */}
          <div className="flex flex-wrap gap-3 mb-6 mt-6">

            {/* Search bar */}
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by customer, order ID, subject, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 h-11 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 rounded-lg"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[175px] h-11 bg-slate-800/50 border-slate-700 text-slate-300 rounded-lg">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
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
              <SelectTrigger className="w-[165px] h-11 bg-slate-800/50 border-slate-700 text-slate-300 rounded-lg">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-slate-200">
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
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <AutoTable
                model={api.conversation}
                searchable={false}
                columns={[
                {
                  header: "Sentiment",
                  render: ({ record }) => (
                    <div className="py-1">
                      <SentimentBadge sentiment={(record as any).sentiment} />
                    </div>
                  ),
                },
                {
                  header: "Subject",
                  render: ({ record }) => (
                    <span className="truncate max-w-sm text-slate-100 text-sm font-medium">
                      {(record as any).subject || "—"}
                    </span>
                  ),
                },
                {
                  header: "Customer",
                  render: ({ record }) => (
                    <span className="text-slate-300 text-sm">{(record as any).primaryCustomerEmail || "—"}</span>
                  ),
                },
                {
                  header: "Classification",
                  render: ({ record }) => {
                    const node = (record as any).classifications?.edges?.[0]?.node;
                    return (
                      <UnifiedBadge 
                        type={node?.intentCategory} 
                        label={formatClassification(node?.intentCategory)} 
                      />
                    );
                  },
                },
                {
                  header: "Priority",
                  render: ({ record }) => (
                    <UnifiedBadge 
                      type={(record as any).currentPriorityBand} 
                      label={getPriorityLabel((record as any).currentPriorityBand)} 
                    />
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
                    <span className="text-slate-400 text-sm">{(record as any).messageCount ?? "—"}</span>
                  ),
                },
                {
                  header: "Last Activity",
                  render: ({ record }) => (
                    <span className="text-slate-400 text-sm">
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
                  currentPriorityBand: true,
                  currentPriorityScore: true,
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

        {/* Conversation Details Drawer */}
        <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleCloseDrawer()}>
          <SheetContent side="right" className="w-full sm:max-w-2xl bg-slate-900 border-slate-800 overflow-y-auto p-0">
            {/* Drawer header band */}
            <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-5 sticky top-0 z-10">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-xl font-semibold text-white">
                    Conversation Details
                  </SheetTitle>
                  {conversationData?.subject && (
                    <p className="text-sm text-slate-400 mt-1 line-clamp-1 pr-8">{conversationData.subject}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseDrawer}
                  className="text-slate-400 hover:text-white flex-shrink-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Drawer content */}
            <div className="px-6 py-6">

            {fetchingConversation && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-teal-500" />
              </div>
            )}

            {conversationError && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>Error loading conversation: {conversationError.toString()}</span>
              </div>
            )}

            {conversationData && (
              <div className="space-y-4">

                {/* Metadata */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Status</p>
                        <UnifiedBadge
                          type={conversationData.status}
                          label={titleCaseEnum(conversationData.status)}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Sentiment</p>
                        <SentimentBadge
                          sentiment={conversationData.sentiment}
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Priority</p>
                        <UnifiedBadge
                          type={conversationData.currentPriorityBand}
                          label={titleCaseEnum(conversationData.currentPriorityBand)}
                        />
                      </div>
                    </div>

                    <Separator className="bg-slate-700" />

                    <div>
                      <p className="text-xs text-slate-400 mb-1">Customer</p>
                      <p className="text-slate-200">
                        {conversationData.primaryCustomerName || conversationData.primaryCustomerEmail || "—"}
                      </p>
                      {conversationData.primaryCustomerName && conversationData.primaryCustomerEmail && (
                        <p className="text-sm text-slate-400">{conversationData.primaryCustomerEmail}</p>
                      )}
                    </div>

                    <Separator className="bg-slate-700" />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">First Message</p>
                        <p className="text-sm text-slate-300">{formatDateTime(conversationData.firstMessageAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Last Activity</p>
                        <p className="text-sm text-slate-300">{formatDateTime(conversationData.latestMessageAt)}</p>
                      </div>
                    </div>

                    {conversationData.resolvedAt && (
                      <>
                        <Separator className="bg-slate-700" />
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Resolved At</p>
                          <p className="text-sm text-slate-300">{formatDateTime(conversationData.resolvedAt)}</p>
                        </div>
                      </>
                    )}

                    <Separator className="bg-slate-700" />

                    <div>
                      <p className="text-xs text-slate-400 mb-1">Message Count</p>
                      <p className="text-slate-200">{conversationData.messageCount ?? 0}</p>
                    </div>

                    {conversationData.currentPriorityScore && (
                      <>
                        <Separator className="bg-slate-700" />
                        <div>
                          <p className="text-xs text-slate-400 mb-1">Priority Score</p>
                          <p className="text-slate-200">{conversationData.currentPriorityScore.toFixed(2)}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Classification */}
                {conversationData.classifications?.edges?.[0]?.node && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Classification</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Intent Category</p>
                        <UnifiedBadge
                          type={conversationData.classifications.edges[0].node.intentCategory}
                          label={titleCaseEnum(conversationData.classifications.edges[0].node.intentCategory)}
                        />
                      </div>

                      <Separator className="bg-slate-700" />

                      <div>
                        <p className="text-xs text-slate-400 mb-1">Sentiment</p>
                        <SentimentBadge sentiment={conversationData.classifications.edges[0].node.sentimentLabel} />
                      </div>

                      {conversationData.classifications.edges[0].node.automationTag && (
                        <>
                          <Separator className="bg-slate-700" />
                          <div>
                            <p className="text-xs text-slate-400 mb-1">Automation Tag</p>
                            <p className="text-slate-200">
                              {titleCaseEnum(conversationData.classifications.edges[0].node.automationTag)}
                            </p>
                          </div>
                        </>
                      )}

                      <Separator className="bg-slate-700" />

                      <div>
                        <p className="text-xs text-slate-400 mb-1">Classified At</p>
                        <p className="text-sm text-slate-300">
                          {formatDateTime(conversationData.classifications.edges[0].node.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Internal Notes */}
                {conversationData.internalNotes && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-lg text-white">Internal Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-300 whitespace-pre-wrap">{conversationData.internalNotes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Messages */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fetchingMessages && (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-teal-500" />
                      </div>
                    )}

                    {!fetchingMessages && messagesData && messagesData.length === 0 && (
                      <p className="text-slate-400 text-center py-8">No messages found</p>
                    )}

                    {!fetchingMessages && messagesData && messagesData.length > 0 && (
                      <div className="space-y-4">
                        {messagesData.map((message: any, index: number) => (
                          <div
                            key={message.id}
                            className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">
                                  {message.fromName || message.fromAddress}
                                </p>
                                {message.fromName && (
                                  <p className="text-xs text-slate-400">{message.fromAddress}</p>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {formatDateTime(message.receivedDateTime)}
                              </p>
                            </div>

                            {message.subject && (
                              <p className="text-sm text-slate-300 font-medium">{message.subject}</p>
                            )}

                            {message.hasAttachments && (
                              <div className="flex items-center gap-1 text-xs text-teal-400">
                                <Paperclip className="h-3 w-3" />
                                <span>Has attachments</span>
                              </div>
                            )}

                            {message.bodyText && (
                              <div className="mt-2 p-3 bg-slate-800/50 rounded text-sm text-slate-300 whitespace-pre-wrap">
                                {message.bodyText.slice(0, 500)}
                                {message.bodyText.length > 500 && "..."}
                              </div>
                            )}

                            {!message.bodyText && message.bodyPreview && (
                              <p className="text-sm text-slate-400 italic">{message.bodyPreview}</p>
                            )}

                            {index < messagesData.length - 1 && (
                              <Separator className="bg-slate-700 mt-4" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}