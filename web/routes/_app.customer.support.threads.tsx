import { useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useOutletContext } from "react-router";
import { useFindMany, useFindFirst, useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";
import type { AuthOutletContext } from "./_app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import TelemetryBanner, { type PageTelemetry } from "@/components/TelemetryBanner";
import { StatusBar } from "@/components/StatusBar";
import { getAiCommentStyle, normalizeAiCommentKind } from "@/components/aiCommentUtils";
import { timeAgo } from "@/components/healthStatus";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton } from "@/shared/ui/Buttons";
import { EmptyState } from "@/shared/ui/EmptyState";
import {
  Search, RefreshCw, Mail, Calendar, User, MessageSquare, Clock, Tag, AlertTriangle,
  LayoutDashboard, Layers, FileText, PenLine, Settings, ShieldAlert, UserX,
} from "lucide-react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
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
  { id: "triage",        label: "Triage",        icon: Layers,          path: `${BASE}/triage-queue` },
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
      <SidebarBrandHeader icon={LayoutDashboard} overline="CUSTOMER" title="SUPPORT" />
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
export default function ThreadsPage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<PageTelemetry | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [markNotCustomerDialogOpen, setMarkNotCustomerDialogOpen] = useState(false);

  const { user } = useOutletContext<AuthOutletContext>() ?? {};

  // Check if user has system-admin role
  // roleList is an array of role objects with a `key` property
  const roleKeys = Array.isArray(user?.roleList)
    ? user.roleList
        .map((role: any) => (typeof role === "string" ? role : role?.key))
        .filter((role: string | undefined): role is string => Boolean(role))
    : [];
  const isAdmin = roleKeys.includes("system-admin") || roleKeys.includes("sysadmin");

  const [{ fetching: triaging }, runTriage] = useGlobalAction(api.triageAllPending);
  const [{ fetching: markNotCustomerLoading }, markNotCustomer] = useGlobalAction(api.markNotCustomer);
  const [{ data: configData }] = useFindFirst(api.appConfiguration);
  const telemetryEnabled = (configData as any)?.telemetryBannersEnabled ?? true;

  const setTelemetryEvent = (event: Omit<PageTelemetry, "at">) => {
    if (!telemetryEnabled) return;
    setTelemetry({ ...event, at: new Date().toISOString() });
  };

  const [{ data: rawConversationsData, fetching }, refresh] = useFindMany(api.conversation, {
    select: {
      id: true,
      subject: true,
      primaryCustomerEmail: true,
      status: true,
      currentCategory: true,
      currentPriorityBand: true,
      sentiment: true,
      messageCount: true,
      latestMessageAt: true,
      createdAt: true,
      updatedAt: true,
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
    },
    first: 50,
    pause: !isAdmin,
  });

  const conversationsData = rawConversationsData as any[] | undefined;
  const conversations = conversationsData || [];
  const [{ data: aiCommentData, fetching: aiCommentFetching }] = useFindMany(api.aiComment, {
    pause: !selectedConvId,
    filter: {
      conversationId: { equals: selectedConvId ?? "" },
    },
    sort: { createdAt: "Descending" },
    first: 50,
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
  const latestSummary = useMemo(() => {
    const comments = (aiCommentData as any[] | undefined) || [];
    if (comments.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const comment of comments) {
      const key = normalizeAiCommentKind(comment.kind);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [aiCommentData]);

  const handleRunTriage = async () => {
    const start = Date.now();
    try {
      const result = (await runTriage({})) as any;
      toast.success(`Triage complete! Processed: ${result.processed}`);
      setTelemetryEvent({
        lastAction: "Auto-triage ran",
        details: `Processed ${result?.processed ?? 0}, skipped ${result?.skipped ?? 0}, errors ${result?.errors ?? 0}`,
        severity: (result?.errors ?? 0) > 0 ? "warning" : "success",
        durationMs: Date.now() - start,
      });
      void refresh();
    } catch (err: any) {
      toast.error(`Triage failed: ${err?.message || String(err)}`);
      setTelemetryEvent({
        lastAction: "Auto-triage failed",
        details: err?.message || String(err),
        severity: "error",
        durationMs: Date.now() - start,
      });
    }
  };

  const handleRefresh = async () => {
    const start = Date.now();
    try {
      const result = (await refresh()) as any;
      const count = Array.isArray(result?.data) ? result.data.length : conversations.length;
      setTelemetryEvent({
        lastAction: "Threads refreshed",
        details: `${count} conversations`,
        severity: "info",
        durationMs: Date.now() - start,
      });
    } catch (err: any) {
      setTelemetryEvent({
        lastAction: "Refresh failed",
        details: err?.message || String(err),
        severity: "error",
        durationMs: Date.now() - start,
      });
    }
  };

  const handleMarkNotCustomer = async () => {
    if (!selectedConvId) return;
    setMarkNotCustomerDialogOpen(false);
    try {
      await markNotCustomer({ conversationId: selectedConvId, reason: "" });
      toast.success("Marked as Not a Customer");
      await refresh();
      setSelectedConvId(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to mark as Not a Customer");
    }
  };

  const filteredConversations = conversations.filter((c) =>
    searchQuery
      ? c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.primaryCustomerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const threadRows = useMemo(() => {
    return filteredConversations.map((conv) => {
      const allMessages =
        conv.messages?.edges?.map((edge: any) => edge?.node).filter(Boolean) ?? [];
      const sortedMessages = [...allMessages].sort((a: any, b: any) => {
        const aTime = a?.receivedDateTime ? new Date(a.receivedDateTime).getTime() : 0;
        const bTime = b?.receivedDateTime ? new Date(b.receivedDateTime).getTime() : 0;
        return aTime - bTime;
      });
      const parentMessage = sortedMessages[sortedMessages.length - 1] ?? null;
      const childMessages = sortedMessages.slice(0, -1);
      return { conv, parentMessage, childMessages };
    });
  }, [filteredConversations]);

  const selectedConversation = selectedConvId
    ? conversations.find((c) => c.id === selectedConvId)
    : null;

  const formatDate = (dateValue: string | Date | null | undefined) => {
    if (!dateValue) return "—";
    const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const cfg: Record<string, { label: string; color: string }> = {
      new: { label: "NEW", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      in_progress: { label: "IN PROGRESS", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      waiting_customer: { label: "WAITING CUSTOMER", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      waiting_internal: { label: "WAITING INTERNAL", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
      resolved: { label: "RESOLVED", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      archived: { label: "ARCHIVED", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
    };
    return cfg[status || ""] ?? { label: "UNKNOWN", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
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

  const formatClassification = (category: string | null | undefined) => {
    if (!category) return "UNCLASSIFIED";
    return category.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ").toUpperCase();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="text-sm text-slate-400 mt-2">
            The Threads debug view is restricted to system admins.
          </p>
          <div className="mt-4 text-xs text-slate-400">
            Current roles: {roleKeys.length > 0 ? roleKeys.join(", ") : "none"}
          </div>
          <Button asChild className="mt-6 bg-teal-500 hover:bg-teal-600 text-black">
            <RouterLink to="/customer/support">Back to dashboard</RouterLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Threads"
          subtitle="View conversation data and metadata for debugging"
          actions={
            <>
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Operations</span>
                  <SecondaryButton
                    onClick={handleRunTriage}
                    disabled={triaging || fetching}
                    className="border-teal-600 text-teal-400 hover:bg-teal-600/10"
                  >
                    <Layers className={`mr-2 h-4 w-4 ${triaging ? "animate-pulse" : ""}`} />
                    {triaging ? "Running Triage..." : "Run Triage"}
                  </SecondaryButton>
                </div>
              )}
              <SecondaryButton onClick={handleRefresh} disabled={fetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                {fetching ? "Refreshing..." : "Refresh"}
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

        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Conversation list */}
          <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-900/30">
            {/* Search bar */}
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search by subject, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <EmptyState
                  title={fetching ? "Loading conversations..." : "No conversations found"}
                  description={fetching ? undefined : "Try adjusting the search or refresh the list."}
                  actionLabel={fetching ? undefined : "Refresh"}
                  onAction={fetching ? undefined : handleRefresh}
                />
              ) : (
                <div className="divide-y divide-slate-800">
                  {threadRows.map(({ conv, parentMessage, childMessages }) => {
                    const isSelected = selectedConvId === conv.id;
                    const maxVisibleChildren = 3;
                    const isExpanded = expandedThreads[conv.id] ?? childMessages.length <= maxVisibleChildren;
                    const visibleChildren = isExpanded
                      ? childMessages
                      : childMessages.slice(-maxVisibleChildren);
                    const hiddenCount = childMessages.length - visibleChildren.length;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConvId(conv.id)}
                        className={`w-full text-left p-4 transition-colors ${
                          isSelected
                            ? "bg-slate-800/80 border-l-2 border-teal-500"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <SentimentBadge sentiment={conv.sentiment} />
                          <span className="text-sm font-medium text-slate-100 flex-1 truncate">
                            {parentMessage?.subject || conv.subject || "(No subject)"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate mb-1">
                          {conv.primaryCustomerEmail || "—"}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <UnifiedBadge type={conv.status} label={getStatusBadge(conv.status).label} />
                          <UnifiedBadge type={conv.currentPriorityBand} label={getPriorityLabel(conv.currentPriorityBand)} />
                        </div>
                        {childMessages.length > 0 && (
                          <div className="mt-3 ml-4 border-l border-slate-800 pl-4 space-y-2">
                            {visibleChildren.map((msg: any) => (
                              <div key={msg.id} className="flex items-start gap-2 text-xs text-slate-400">
                                <span className="whitespace-nowrap text-slate-500">
                                  {formatDate(msg.receivedDateTime)}
                                </span>
                                <span className="text-slate-300">
                                  {msg.fromName || msg.fromAddress || "Unknown sender"}
                                </span>
                                <span className="text-slate-500 truncate">
                                  {msg.bodyPreview || "(No preview)"}
                                </span>
                              </div>
                            ))}
                            {hiddenCount > 0 && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedThreads((prev) => ({ ...prev, [conv.id]: true }));
                                }}
                                className="text-[11px] text-teal-400 hover:text-teal-300"
                              >
                                Show {hiddenCount} more
                              </button>
                            )}
                            {hiddenCount === 0 && childMessages.length > maxVisibleChildren && (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedThreads((prev) => ({ ...prev, [conv.id]: false }));
                                }}
                                className="text-[11px] text-slate-400 hover:text-slate-200"
                              >
                                Show fewer
                              </button>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="flex-1 overflow-y-auto bg-slate-950">
            {!selectedConversation ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a conversation to view details</p>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Title */}
                  <div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                      {selectedConversation.subject || "(No subject)"}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="h-4 w-4" />
                      <span>{selectedConversation.primaryCustomerEmail || "—"}</span>
                    </div>
                    {selectedConversation.currentCategory !== "not_customer" && (
                      <div className="mt-3">
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
                    )}
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MetadataCard
                      icon={<Tag className="h-5 w-5 text-teal-400" />}
                      label="Conversation ID"
                      value={selectedConversation.id}
                    />
                    <MetadataCard
                      icon={<AlertTriangle className="h-5 w-5 text-teal-400" />}
                      label="Status"
                      value={
                        <UnifiedBadge
                          type={selectedConversation.status}
                          label={getStatusBadge(selectedConversation.status).label}
                        />
                      }
                    />
                    <MetadataCard
                      icon={<AlertTriangle className="h-5 w-5 text-teal-400" />}
                      label="Priority"
                      value={
                        <UnifiedBadge
                          type={selectedConversation.currentPriorityBand}
                          label={getPriorityLabel(selectedConversation.currentPriorityBand)}
                        />
                      }
                    />
                    <MetadataCard
                      icon={<User className="h-5 w-5 text-teal-400" />}
                      label="Sentiment"
                      value={<SentimentBadge sentiment={selectedConversation.sentiment} />}
                    />
                    <MetadataCard
                      icon={<MessageSquare className="h-5 w-5 text-teal-400" />}
                      label="Message Count"
                      value={selectedConversation.messageCount?.toString() || "—"}
                    />
                    <MetadataCard
                      icon={<Calendar className="h-5 w-5 text-teal-400" />}
                      label="Created At"
                      value={formatDate(selectedConversation.createdAt)}
                    />
                    <MetadataCard
                      icon={<Clock className="h-5 w-5 text-teal-400" />}
                      label="Updated At"
                      value={formatDate(selectedConversation.updatedAt)}
                    />
                    <MetadataCard
                      icon={<Clock className="h-5 w-5 text-teal-400" />}
                      label="Latest Message At"
                      value={formatDate(selectedConversation.latestMessageAt)}
                    />
                  </div>

                  {/* Latest activity */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-white">Latest Activity</h3>
                      {latestSummary && (
                        <div className="text-[11px] text-slate-500">
                          {Object.entries(latestSummary)
                            .map(([key, value]) => `${key.replace("_", " ")}: ${value}`)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    {aiCommentFetching ? (
                      <div className="text-sm text-slate-500">Loading activity...</div>
                    ) : latestAiComment ? (
                      <div className="rounded-lg border border-slate-700/40 bg-slate-900/60 p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                              const style = getAiCommentStyle(latestAiComment.kind);
                              return (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.className}`}
                                >
                                  <style.Icon className="h-3 w-3" />
                                  {style.label}
                                </span>
                              );
                            })()}
                            {latestAiComment.batchOperation?.id && (
                              <RouterLink
                                to={`/customer/support/triage/history?batch=${latestAiComment.batchOperation.id}`}
                                className="text-[11px] text-teal-400 hover:text-teal-300"
                              >
                                Batch {latestAiComment.batchOperation.id}
                              </RouterLink>
                            )}
                          </div>
                          <span
                            className="text-[11px] text-slate-500"
                            title={
                              latestAiComment.createdAt
                                ? new Date(latestAiComment.createdAt).toLocaleString()
                                : "Unknown"
                            }
                          >
                            {timeAgo(latestAiComment.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 whitespace-pre-wrap">
                          {latestAiComment.content}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">
                          Source: {latestAiComment.source || "system"}
                          {latestAiComment.user?.email ? ` · ${latestAiComment.user.email}` : ""}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No activity recorded yet.</div>
                    )}
                  </div>

                  {/* Classifications */}
                  {selectedConversation.classifications && selectedConversation.classifications.edges.length > 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Tag className="h-5 w-5 text-teal-400" />
                        Classifications
                      </h3>
                      <div className="space-y-3">
                        {selectedConversation.classifications.edges.map(({ node }: any) => (
                          <div
                            key={node.id}
                            className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-700/40 rounded-lg"
                          >
                            <div className="flex-1">
                              <UnifiedBadge
                                type={node.intentCategory}
                                label={formatClassification(node.intentCategory)}
                              />
                              {node.sentimentLabel && (
                                <span className="ml-2 text-xs text-slate-400">
                                  Sentiment: {node.sentimentLabel}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {formatDate(node.createdAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Raw JSON */}
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Raw JSON</h3>
                    <pre className="text-xs text-slate-300 overflow-x-auto bg-slate-900/60 p-4 rounded-lg border border-slate-700/40">
                      {JSON.stringify(selectedConversation, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

function MetadataCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-sm text-slate-100 break-all">{value}</div>
    </div>
  );
}