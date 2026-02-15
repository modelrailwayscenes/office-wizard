import { useState } from "react";
import { useFindMany } from "@gadgetinc/react";
import { api } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      primaryCustomerName: true,
      messageCount: true,
      unreadCount: true,
      firstMessageAt: true,
      latestMessageAt: true,
      status: true,
      currentPriorityBand: true,
      currentPriorityScore: true,
      currentCategory: true,
      sentiment: true,
      requiresHumanReview: true,
      automationTag: true,
      isVerifiedCustomer: true,
      customerConfidenceScore: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        edges: {
          node: {
            id: true,
            subject: true,
            fromAddress: true,
            fromName: true,
            bodyPreview: true,
            receivedDateTime: true,
            hasAttachments: true,
            isRead: true,
          },
        },
      },
    },
    sort: { latestMessageAt: "Descending" },
    first: 100,
  });

  const conversations = (conversationsData || []) as any[];

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(query) ||
      conv.primaryCustomerEmail?.toLowerCase().includes(query) ||
      conv.primaryCustomerName?.toLowerCase().includes(query) ||
      conv.id?.toLowerCase().includes(query)
    );
  });

  const selectedConv = conversations.find((c) => c.id === selectedConvId);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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

  const getPriorityLabel = (priority: string | null | undefined) => {
    switch (priority) {
      case "urgent": return "URGENT";
      case "high": return "HIGH";
      case "medium": return "MEDIUM";
      case "low": return "LOW";
      default: return "UNCLASSIFIED";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950">
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
            variant="ghost"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 text-teal-400 hover:bg-slate-700 hover:text-teal-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
            <span className="text-sm font-medium">{fetching ? "Refreshing..." : "Refresh"}</span>
          </Button>
        </div>
      </div>

      {/* Stats + Search */}
      <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/30 flex-shrink-0">
        {/* Stats */}
        <div className="mb-6 flex gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-400">TOTAL CONVERSATIONS</p>
            <p className="text-2xl font-semibold text-white">{conversations.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-400">FILTERED</p>
            <p className="text-2xl font-semibold text-white">{filteredConversations.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-3">
            <p className="text-xs text-slate-400">SELECTED</p>
            <p className="text-2xl font-semibold text-white">{selectedConv ? "1" : "0"}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by subject, customer, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 rounded-lg"
          />
        </div>
      </div>

      {/* Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Conversation List */}
        <div className="w-1/2 border-r border-slate-800 overflow-y-auto">
          {fetching && conversations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3" />
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No conversations found
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-4 cursor-pointer hover:bg-slate-900/50 transition-colors ${
                    selectedConvId === conv.id ? "bg-slate-900/80 border-l-2 border-teal-500" : ""
                  }`}
                >
                  {/* Row 1: Priority + Subject */}
                  <div className="flex items-start gap-2 mb-2">
                    <UnifiedBadge 
                      type={conv.currentPriorityBand} 
                      label={getPriorityLabel(conv.currentPriorityBand)} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {conv.subject || "(No subject)"}
                      </div>
                    </div>
                    {conv.requiresHumanReview && (
                      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    )}
                  </div>

                  {/* Row 2: Customer Email */}
                  <div className="text-sm text-slate-400 truncate mb-2 flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {conv.primaryCustomerEmail || conv.primaryCustomerName || "Unknown"}
                  </div>

                  {/* Row 3: Metadata */}
                  <div className="flex items-center gap-2 text-xs">
                    <SentimentBadge sentiment={conv.sentiment} />
                    <Separator orientation="vertical" className="h-4" />
                    <Clock className="h-3 w-3 text-slate-500" />
                    <span className="text-slate-500">{formatTime(conv.latestMessageAt)}</span>
                    {conv.isVerifiedCustomer && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <UnifiedBadge type="verified" label="VERIFIED" />
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Details */}
        <div className="w-1/2 overflow-y-auto">
          {!selectedConv ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a conversation to view details
            </div>
          ) : (
            <div className="p-8 space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {selectedConv.subject || "(No subject)"}
                </h2>
                <p className="text-sm text-slate-400">
                  {selectedConv.primaryCustomerEmail || selectedConv.primaryCustomerName || "Unknown"}
                </p>
              </div>

              {/* Metadata Grid - 3 columns for first 3 rows */}
              <div className="grid grid-cols-3 gap-4">
                {/* Row 1 */}
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">PRIORITY</div>
                  <UnifiedBadge 
                    type={selectedConv.currentPriorityBand} 
                    label={getPriorityLabel(selectedConv.currentPriorityBand)} 
                  />
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">CATEGORY</div>
                  <div className="text-sm text-white">{(selectedConv.currentCategory || "UNCLASSIFIED").toUpperCase()}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">STATUS</div>
                  <UnifiedBadge type={selectedConv.status} label={(selectedConv.status || "UNKNOWN").toUpperCase().replace(/_/g, " ")} />
                </Card>

                {/* Row 2 */}
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">FIRST MESSAGE</div>
                  <div className="text-sm text-white">{formatTime(selectedConv.firstMessageAt)}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">LAST ACTIVITY</div>
                  <div className="text-sm text-white">{formatTime(selectedConv.latestMessageAt)}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">PRIORITY SCORE</div>
                  <div className="text-sm text-white">{selectedConv.currentPriorityScore || 0}</div>
                </Card>

                {/* Row 3 */}
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">MESSAGES</div>
                  <div className="text-sm text-white">{selectedConv.messageCount || 1}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">UNREAD</div>
                  <div className="text-sm text-white">{selectedConv.unreadCount || 0}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">CONFIDENCE</div>
                  <div className="text-sm text-white">{selectedConv.customerConfidenceScore || 0}%</div>
                </Card>
              </div>

              {/* Sentiment & Action - 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-2">SENTIMENT</div>
                  <SentimentBadge sentiment={selectedConv.sentiment} />
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-2">ACTION</div>
                  <UnifiedBadge 
                    type={selectedConv.automationTag || selectedConv.currentCategory || "review"} 
                    label={(selectedConv.automationTag || selectedConv.currentCategory || "REVIEW").toUpperCase()} 
                  />
                </Card>
              </div>

              {/* Review Flag */}
              {selectedConv.requiresHumanReview && (
                <Card className="bg-amber-500/10 border-amber-500/30 p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Requires Human Review</span>
                  </div>
                </Card>
              )}

              {/* Verification Status */}
              {selectedConv.isVerifiedCustomer && (
                <Card className="bg-green-500/10 border-green-500/30 p-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Verified Customer</span>
                  </div>
                </Card>
              )}

              {/* IDs Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">IDENTIFIERS</h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Conversation ID:</span>
                    <span className="text-slate-300">{selectedConv.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Created:</span>
                    <span className="text-slate-300">{formatDate(selectedConv.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Updated:</span>
                    <span className="text-slate-300">{formatDate(selectedConv.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-3">MESSAGES ({selectedConv.messages?.edges?.length || 0})</h3>
                <div className="space-y-3">
                  {selectedConv.messages?.edges?.map(({ node }: any) => (
                    <Card key={node.id} className="bg-slate-900/50 border-slate-800 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-medium text-white">{node.fromName || node.fromAddress}</div>
                          <div className="text-xs text-slate-500">{node.fromAddress}</div>
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(node.receivedDateTime)}</div>
                      </div>
                      <div className="text-sm text-slate-300 mb-2">{node.subject}</div>
                      <div className="text-xs text-slate-400">{node.bodyPreview}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {node.hasAttachments && (
                          <span className="text-xs text-teal-400">📎 Has attachments</span>
                        )}
                        {!node.isRead && (
                          <span className="text-xs text-blue-400">• Unread</span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
