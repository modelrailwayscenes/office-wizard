import { useState } from "react";
import { useFindMany } from "@gadgetinc/react";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { SentimentBadge } from "@/components/SentimentBadge";
import { Search, RefreshCw, Mail, Calendar, User, MessageSquare, Clock, Tag, AlertTriangle } from "lucide-react";

export default function ThreadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

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
  });

  const conversations = conversationsData || [];

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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Threads</h1>
            <p className="text-sm text-slate-400 mt-1">
              View conversation data and metadata for debugging
            </p>
          </div>
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
                      {selectedConversation.classifications.edges.map(({ node }) => (
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