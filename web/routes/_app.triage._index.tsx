import { useState, useMemo } from "react";
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
import BatchModal, { type BatchModalSubmitPayload } from "@/components/BatchModal";
import {
  Mail,
  Clock,
  User,
  Tag,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Send,
  Archive,
  Star,
  CheckSquare,
} from "lucide-react";

export default function TriageQueuePage() {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "urgent" | "pending" | "due" | "starred">("all");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  
  // Batch operations state
  const [selectedConvIds, setSelectedConvIds] = useState<string[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  // ── Helper: Extract order numbers from text ────────────────────────────────
  const extractOrderNumber = (text: string): string | null => {
    const match = text?.match(/\b(MRS|NRS)[-\s]?\d{5}\b/i);
    return match ? match[0].replace(/\s/g, "-").toUpperCase() : null;
  };

  // ── Helper: Get all order numbers from conversation ───────────────────────
  const getOrderNumbers = (conv: any): string[] => {
    const orders = new Set<string>();
    
    // Check subject
    const subjectOrder = extractOrderNumber(conv.subject || "");
    if (subjectOrder) orders.add(subjectOrder);
    
    // Check all messages
    conv.messages?.edges?.forEach((edge: any) => {
      const msg = edge?.node;
      const bodyOrder = extractOrderNumber(msg?.bodyPreview || "");
      if (bodyOrder) orders.add(bodyOrder);
    });
    
    return Array.from(orders);
  };


  const [{ data: conversationsData, fetching, error }, refresh] = useFindMany(api.conversation, {
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

  const conversations = conversationsData as any;

  const [{ fetching: triaging }, runTriage] = useGlobalAction(api.triageAllPending);
  const [, generateDraft] = useGlobalAction(api.generateDraft);

  const handleRunTriage = async () => {
    try {
      const result = await runTriage({}) as any;
      toast.success(`Triage complete! Processed: ${result.processed}`);
      refresh();
    } catch (err) {
      toast.error(`Triage failed: ${err}`);
    }
  };

  const handleGenerateDraft = async (conversationId: string, regenerate = false) => {
    setGeneratingDraft(true);
    try {
      const result = await generateDraft({ conversationId, regenerate }) as any;
      toast.success(regenerate ? "Draft regenerated!" : "Draft generated!");
      refresh(); // Refresh to get updated draft content
    } catch (err: any) {
      toast.error(err.message || "Failed to generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Batch operations
  const batchItems = useMemo(() => 
    conversations
      ?.filter((c: any) => selectedConvIds.includes(c.id))
      .map((c: any) => ({
        id: c.id,
        subject: c.subject,
        primaryCustomerName: c.primaryCustomerName,
        primaryCustomerEmail: c.primaryCustomerEmail,
        currentPriorityBand: c.currentPriorityBand,
        currentCategory: c.currentCategory,
        automationTag: c.automationTag,
        unreadCount: c.unreadCount,
        hasDraft: !!c.draftMessage,
      })) || [],
    [conversations, selectedConvIds]
  );

  const handleBatchSubmit = async (payload: BatchModalSubmitPayload) => {
    console.log("Batch action:", payload);
    
    try {
      // TODO: Implement your batch operation API
      // await api.runBatchOperation({
      //   action: payload.action,
      //   conversationIds: payload.conversationIds,
      //   note: payload.note,
      // });
      
      toast.success(`Batch ${payload.action} queued for ${payload.conversationIds.length} conversations`);
      setBatchModalOpen(false);
      setSelectedConvIds([]);
      
    } catch (error: any) {
      toast.error("Batch action failed: " + error.message);
    }
  };

  const handleToggleSelection = (convId: string, checked: boolean) => {
    if (checked) {
      setSelectedConvIds([...selectedConvIds, convId]);
    } else {
      setSelectedConvIds(selectedConvIds.filter(id => id !== convId));
    }
  };

  const handleSelectAll = () => {
    if (selectedConvIds.length === conversations?.length) {
      setSelectedConvIds([]);
    } else {
      setSelectedConvIds(conversations?.map((c: any) => c.id) || []);
    }
  };

  const selectedConv = conversations?.find((c: any) => c.id === selectedConvId) as any;
  const firstMessage = selectedConv?.messages?.edges?.[0]?.node as any;

  // Priority counts
  const criticalCount = conversations?.filter((c: any) => c.currentPriorityBand === "urgent").length || 0;
  const highCount = conversations?.filter((c: any) => c.currentPriorityBand === "high").length || 0;
  const mediumCount = conversations?.filter((c: any) => c.currentPriorityBand === "medium").length || 0;
  const lowCount = conversations?.filter((c: any) => c.currentPriorityBand === "low").length || 0;
  const totalQueue = conversations?.length || 0;

  const getPriorityColor = (band: string | null | undefined) => {
    switch (band) {
      case "urgent":
        return "text-red-400 border-red-500/30 bg-red-500/10";
      case "high":
        return "text-orange-400 border-orange-500/30 bg-orange-500/10";
      case "medium":
        return "text-teal-400 border-teal-500/30 bg-teal-500/10";
      case "low":
        return "text-green-400 border-green-500/30 bg-green-500/10";
      case "unclassified":
        return "text-slate-400 border-slate-500/30 bg-slate-500/10";
      default:
        return "text-slate-400 border-slate-500/30 bg-slate-500/10";
    }
  };

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

  const getSentimentBadge = (sentiment: string | null | undefined) => {
    if (!sentiment) return { 
      label: "NEUTRAL", 
      style: { backgroundColor: "#4a3600", color: "#ffffff", border: "1px solid #5a4600" } 
    };
    
    const lower = sentiment.toLowerCase();
    
    // 5-level sentiment system with custom colors
    if (lower.includes("very_negative") || lower.includes("very negative")) {
      return { label: "VERY NEGATIVE", style: { backgroundColor: "#6e1111", color: "#ffffff", border: "1px solid #8e1111" } };
    }
    if (lower.includes("negative")) {
      return { label: "NEGATIVE", style: { backgroundColor: "#5e2800", color: "#ffffff", border: "1px solid #7e3800" } };
    }
    if (lower.includes("very_positive") || lower.includes("very positive")) {
      return { label: "VERY POSITIVE", style: { backgroundColor: "#17440c", color: "#ffffff", border: "1px solid #27540c" } };
    }
    if (lower.includes("positive")) {
      return { label: "POSITIVE", style: { backgroundColor: "#333f00", color: "#ffffff", border: "1px solid #434f00" } };
    }
    
    return { label: "NEUTRAL", style: { backgroundColor: "#4a3600", color: "#ffffff", border: "1px solid #5a4600" } };
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* UPDATED HEADER - Consistent padding and structure */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Triage Queue</h1>
            <p className="text-sm text-slate-400 mt-1">
              Browse and search all emails with a flexible approach to triage
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/10">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {conversations?.filter((c: any) => c.requiresHumanReview).length || 0} DRAFTS PENDING
            </Badge>
            {selectedConvIds.length > 0 && (
              <Button
                onClick={() => setBatchModalOpen(true)}
                variant="outline"
                className="border-slate-700 hover:bg-slate-800"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Batch Actions ({selectedConvIds.length})
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
            {conversations?.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No conversations to triage
              </div>
            )}
            {conversations
              ?.filter((c: any) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  c.subject?.toLowerCase().includes(q) ||
                  c.primaryCustomerEmail?.toLowerCase().includes(q) ||
                  c.primaryCustomerName?.toLowerCase().includes(q) ||
                  getOrderNumbers(c).some(o => o.toLowerCase().includes(q))
                );
              })
              ?.map((conv: any) => (
                <div
                  key={conv.id}
                  className={`p-4 hover:bg-slate-900/50 transition-colors ${
                    selectedConvId === conv.id ? "bg-slate-900/80 border-l-2 border-teal-500" : ""
                  }`}
                >
                  {/* Row 1: Checkbox + Priority + Subject */}
                  <div className="flex items-start gap-2 mb-2">
                    <Checkbox
                      checked={selectedConvIds.includes(conv.id)}
                      onCheckedChange={(checked) => handleToggleSelection(conv.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5"
                    />
                    <UnifiedBadge 
                      type={conv.currentPriorityBand} 
                      label={getPriorityLabel(conv.currentPriorityBand)} 
                    />
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedConvId(conv.id)}
                    >
                      <div className="text-white font-medium truncate">{conv.subject || "(No subject)"}</div>
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
                    {getOrderNumbers(conv).length > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Tag className="h-3 w-3 text-teal-400" />
                        <span className="text-teal-400">{getOrderNumbers(conv)[0]}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
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

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">PRIORITY</div>
                  <div>
                    <UnifiedBadge 
                      type={selectedConv.currentPriorityBand} 
                      label={getPriorityLabel(selectedConv.currentPriorityBand)} 
                    />
                  </div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">CATEGORY</div>
                  <div className="text-sm text-white">{(selectedConv.currentCategory || "UNCLASSIFIED").toUpperCase()}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">FIRST MESSAGE</div>
                  <div className="text-sm text-white">{formatTime(selectedConv.firstMessageAt)}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">LAST ACTIVITY</div>
                  <div className="text-sm text-white">{formatTime(selectedConv.latestMessageAt)}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">MESSAGES</div>
                  <div className="text-sm text-white">{selectedConv.messageCount || 1}</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-1">UNREAD</div>
                  <div className="text-sm text-white">{selectedConv.unreadCount || 0}</div>
                </Card>
              </div>

              {/* Sentiment & Confidence */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-2">SENTIMENT</div>
                  <div>
                    <SentimentBadge sentiment={selectedConv.sentiment} />
                  </div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-2">CONFIDENCE</div>
                  <div className="text-2xl font-bold text-teal-400">92%</div>
                </Card>
                <Card className="bg-slate-900/50 border-slate-800 p-4">
                  <div className="text-xs text-slate-500 mb-2">ACTION</div>
                  <div>
                    <UnifiedBadge 
                      type={selectedConv.automationTag || selectedConv.currentCategory || "review"} 
                      label={(selectedConv.automationTag || selectedConv.currentCategory || "REVIEW").toUpperCase()} 
                    />
                  </div>
                </Card>
              </div>

              {/* Order Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                {getOrderNumbers(selectedConv).map((orderNum, idx) => (
                  <Badge key={idx} variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/10">
                    <Tag className="h-3 w-3 mr-1" />
                    {orderNum}
                  </Badge>
                ))}
                {getOrderNumbers(selectedConv).length === 0 && (
                  <Badge variant="outline" className="text-slate-400 border-slate-500/30 bg-slate-500/10">
                    <Tag className="h-3 w-3 mr-1" />
                    NO ORDER NUMBER FOUND
                  </Badge>
                )}
              </div>

              {/* Customer History */}
              <Card className="bg-slate-900/50 border-slate-800 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  MESSAGE TIMELINE ({selectedConv.messageCount || 0})
                </h3>
                <div className="space-y-3 text-sm max-h-60 overflow-y-auto">
                  {selectedConv.messages?.edges?.length > 0 ? (
                    selectedConv.messages.edges.map((edge: any, idx: number) => {
                      const msg = edge?.node;
                      if (!msg) return null;
                      return (
                        <div key={msg.id || idx} className="flex items-start gap-3 pb-3 border-b border-slate-800/50 last:border-0">
                          <Mail className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{msg.subject || "(No subject)"}</div>
                            <div className="text-slate-400 text-xs truncate">{msg.fromAddress || msg.fromName}</div>
                            <div className="text-slate-500 text-xs mt-1">{formatTime(msg.receivedDateTime)}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 text-center py-4">No message history available</div>
                  )}
                </div>
              </Card>

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
                  {selectedConv.aiDraftGeneratedAt ? (
                    <Badge variant="outline" className="text-teal-400 border-teal-500/30 bg-teal-500/10">
                      READY TO REVIEW
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 border-slate-500/30 bg-slate-500/10">
                      NOT GENERATED
                    </Badge>
                  )}
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-slate-500">
                        Generated {formatTime(selectedConv.aiDraftGeneratedAt)} using {selectedConv.aiDraftModel || "Claude"}
                      </div>
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
                  <>
                    <div className="text-sm text-slate-400 leading-relaxed bg-slate-950/50 p-4 rounded-lg border border-slate-700 mb-4 text-center py-8">
                      No draft generated yet. Click the button below to generate an AI-powered response.
                    </div>
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
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Batch Modal */}
      <BatchModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        items={batchItems}
        onSubmit={handleBatchSubmit}
        loading={false}
      />
    </div>
  );
}
