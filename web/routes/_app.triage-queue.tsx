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
import BatchReviewModal from "@/components/BatchReviewModal";
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

  const [{ data: conversationsData }, refresh] = useFindMany(api.conversation, {
    filter: {
      AND: [
        { status: { notEquals: "resolved" } },
        { status: { notEquals: "ignored" } },
        { isCustomer: { notEquals: false } },
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

  const conversations = conversationsData as any;

  const [{ fetching: triaging }, runTriage] = useGlobalAction(api.triageAllPending);
  const [, generateDraft] = useGlobalAction(api.generateDraft);
  const [{ fetching: batchProcessing }, runBatchOperation] = useGlobalAction(api.runBatchOperation);

  const handleRunTriage = async () => {
    try {
      const result = (await runTriage({})) as any;
      toast.success(`Triage complete! Processed: ${result.processed}`);
      refresh();
    } catch (err) {
      toast.error(`Triage failed: ${err}`);
    }
  };

  const handleGenerateDraft = async (conversationId: string, regenerate = false) => {
    setGeneratingDraft(true);
    try {
      await generateDraft({ conversationId, regenerate });
      toast.success(regenerate ? "Draft regenerated!" : "Draft generated!");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate draft");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const batchItems = useMemo(
    () =>
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
          hasDraft: !!c.aiDraftContent,
        })) || [],
    [conversations, selectedConvIds]
  );

  const handleToggleSelection = (convId: string, checked: boolean) => {
    if (checked) setSelectedConvIds([...selectedConvIds, convId]);
    else setSelectedConvIds(selectedConvIds.filter((id) => id !== convId));
  };

  const selectedConv = conversations?.find((c: any) => c.id === selectedConvId) as any;
  const firstMessage = selectedConv?.messages?.edges?.[0]?.node as any;

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

  const batchForModal = useMemo(() => {
    const emails =
      (conversations || [])
        ?.filter((c: any) => selectedConvIds.includes(c.id))
        ?.map((c: any) => ({
          id: c.id,
          conversationId: c.id,
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
          receivedAt: c.latestMessageAt || c.firstMessageAt || new Date().toISOString(),
          originalSubject: c.subject || "(No subject)",
          originalBody: c.messages?.edges?.[0]?.node?.bodyPreview || "",
          aiResponse: c.aiDraftContent || "",
          aiAnalysis: {
            request: c.currentCategory,
            orderId: getOrderNumbers(c)[0],
            tone: "Neutral",
            urgency: c.currentPriorityBand,
          },
          hasDraft: !!c.aiDraftContent,
          status: "pending" as const,
        })) || [];

    return {
      id: "batch-selected",
      type: "manual",
      label: `Selected (${selectedConvIds.length})`,
      emails,
      aiSuggestion: `Review and process ${emails.length} draft(s).`,
      estimatedTimeSaved: emails.length * 3,
    };
  }, [conversations, selectedConvIds]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* header + content unchanged ... */}

      {/* Batch Modal (FIXED PROPS) */}
      <BatchReviewModal
        batch={batchForModal}
        isOpen={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        onSendAll={async (emailIds) => {
          try {
            await runBatchOperation({
              action: "send",
              conversationIds: emailIds,
              note: "",
            });
            toast.success(`Sent ${emailIds.length} item(s)`);
            setBatchModalOpen(false);
            setSelectedConvIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Send failed: " + (error?.message || error));
          }
        }}
        onSaveDrafts={async (emailIds) => {
          try {
            await runBatchOperation({
              action: "saveDrafts",
              conversationIds: emailIds,
              note: "",
            });
            toast.success(`Saved ${emailIds.length} draft(s)`);
            setBatchModalOpen(false);
            setSelectedConvIds([]);
            refresh();
          } catch (error: any) {
            toast.error("Save drafts failed: " + (error?.message || error));
          }
        }}
        onRegenerateResponse={async (emailId) => {
          await handleGenerateDraft(emailId, true);
          return "Regenerated";
        }}
      />
    </div>
  );
}
