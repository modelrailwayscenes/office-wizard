import { useState } from "react";
import { Link as RouterLink, useLocation, useOutletContext } from "react-router";
import { useFindMany, useGlobalAction } from "@gadgetinc/react";
import { api } from "../api";
import { toast } from "sonner";
import type { AuthOutletContext } from "./_app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import {
  Search, RefreshCw, Mail, Calendar, User, MessageSquare, Clock, Tag, AlertTriangle,
  LayoutDashboard, Layers, FileText, PenLine, Settings,
} from "lucide-react";

// ── Customer Sidebar ────────────────────────────────────────────────
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
export default function ThreadsPage() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const { user } = useOutletContext<AuthOutletContext>();

  // Check if user has system-admin role
  // roleList is an array of role objects with a `key` property
  const isAdmin = Array.isArray(user?.roleList) && user.roleList.some((role: any) => role?.key === "system-admin");

  const [{ fetching: triaging }, runTriage] = useGlobalAction(api.triageAllPending);

  const [{ data: conversationsData, fetching }, refresh] = useFindMany(api.conversation, {
    select: {
      id: true,
      subject: true,
      primaryCustomerEmail: true,
      status: true,
      currentPriorityBand: true,
      sentiment: true,
      messageCount: true,
      latestMessageAt: true,
      createdAt: true,
      updatedAt: true,
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

  const conversations = conversationsData || [];

  const handleRunTriage = async () => {
    try {
      const result = (await runTriage({})) as any;
      toast.success(`Triage complete! Processed: ${result.processed}`);
      void refresh();
    } catch (err: any) {
      toast.error(`Triage failed: ${err?.message || String(err)}`);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    searchQuery
      ? c.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.primaryCustomerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

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
          <Button asChild className="mt-6 bg-teal-500 hover:bg-teal-600 text-black">
            <RouterLink to="/">Back to dashboard</RouterLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 bg-slate-950 text-white">
      <CustomerSidebar currentPath={location.pathname} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">Threads</h1>
              <p className="text-sm text-slate-400 mt-1">
                View conversation data and metadata for debugging
              </p>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Operations</span>
                  <Button
                    onClick={handleRunTriage}
                    disabled={triaging || fetching}
                    variant="outline"
                    className="border-teal-600 text-teal-400 hover:bg-teal-600/10"
                  >
                    <Layers className={`mr-2 h-4 w-4 ${triaging ? "animate-pulse" : ""}`} />
                    {triaging ? "Running Triage..." : "Run Triage"}
                  </Button>
                </div>
              )}
              <Button
                onClick={() => refresh()}
                disabled={fetching}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
                {fetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>

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
                <div className="p-8 text-center text-slate-500">
                  {fetching ? "Loading conversations..." : "No conversations found"}
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {filteredConversations.map((conv) => {
                    const isSelected = selectedConvId === conv.id;
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
                            {conv.subject || "(No subject)"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 truncate mb-1">
                          {conv.primaryCustomerEmail || "—"}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <UnifiedBadge type={conv.status} label={getStatusBadge(conv.status).label} />
                          <UnifiedBadge type={conv.currentPriorityBand} label={getPriorityLabel(conv.currentPriorityBand)} />
                        </div>
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
