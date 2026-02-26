import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import BatchReviewModal from "../components/BatchReviewModal";

/**
 * Triage Landing Page
 * 
 * Layout matches conversations page pattern:
 * - min-h-screen bg-background
 * - Header: border-b border-border bg-card/50 px-8 py-6
 * - Content: p-8
 * - Full width, no max-w constraint
 * 
 * Deploy to: /web/routes/_app.triage._index.tsx
 */

// ─── Types ───────────────────────────────────────────────────────────
interface BatchOpportunity {
  id: string;
  type: string;
  label: string;
  emailCount: number;
  aiSuggestion: string;
  estimatedTimeSaved: number;
  emails: any[];
}

interface RecentBatch {
  id: string;
  type: string;
  label: string;
  status: "completed" | "partial" | "failed";
  emailCount: number;
  sentCount: number;
  savedCount: number;
  errorCount: number;
  completedAt: string;
  timeSaved: number;
  createdBy: string;
}

// ─── Icon Components ─────────────────────────────────────────────────
function QueueIcon() {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
      <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.43 9.75m11.14 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25-4.179 2.25M6.43 14.25L2.25 16.5 12 21.75l9.75-5.25-4.179-2.25" />
      </svg>
    </div>
  );
}

function WorkflowIcon() {
  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
      <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    </div>
  );
}

function CheckBullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {children}
    </div>
  );
}

// ─── Batch Opportunity Card ──────────────────────────────────────────
function BatchOpportunityCard({
  opportunity,
  onClick,
}: {
  opportunity: BatchOpportunity;
  onClick: () => void;
}) {
  const typeIcons: Record<string, React.ReactNode> = {
    tracking: (
      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    refund: (
      <svg className="w-5 h-5 text-amber-600 dark:text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    product_question: (
      <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
    general: (
      <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-muted/50 border border-border rounded-xl p-4 hover:bg-muted/70 hover:border-primary/30 transition-all group text-left"
    >
      <div className="w-10 h-10 bg-muted border border-border/50 rounded-lg flex items-center justify-center shrink-0 group-hover:border-primary/30">
        {typeIcons[opportunity.type] || typeIcons.general}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm">{opportunity.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {opportunity.emailCount} similar emails detected – review each before sending
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Time Saved</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{opportunity.estimatedTimeSaved} minutes</p>
        </div>
        <svg className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </button>
  );
}

// ─── Recent Batch Row ────────────────────────────────────────────────
function RecentBatchRow({ batch }: { batch: RecentBatch }) {
  const statusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    partial: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    failed: "bg-red-500/15 text-red-700 dark:text-red-300",
  };
  const statusLabels: Record<string, string> = {
    completed: "Completed",
    partial: "Partial",
    failed: "Failed",
  };

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{batch.label}</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColors[batch.status]}`}>
            {statusLabels[batch.status]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {batch.sentCount} sent · {batch.savedCount} saved as draft
          {batch.errorCount > 0 && ` · ${batch.errorCount} errors`}
          {" · "}{formatDate(batch.completedAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{batch.timeSaved}m saved</span>
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────
export default function TriageLandingPage() {
  const navigate = useNavigate();

  const [batchOpportunities, setBatchOpportunities] = useState<BatchOpportunity[]>([]);
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchOpportunity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual Gadget API calls
        setBatchOpportunities([
          {
            id: "batch-1",
            type: "tracking",
            label: "Tracking Requests",
            emailCount: 7,
            aiSuggestion: "Send tracking playbook to all",
            estimatedTimeSaved: 12,
            emails: [
              {
                id: "e1",
                conversationId: "conv-1",
                customerName: "John Smith",
                customerEmail: "john@example.com",
                orderId: "#MRS-5001",
                priority: "P2",
                receivedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
                originalSubject: "Tracking number for order #MRS-5001",
                originalBody: "Hi there,\n\nI placed order #MRS-5001 about a week ago and haven't received any tracking information yet. Could you send me the tracking number?\n\nThanks,\nJohn Smith",
                aiResponse: "Dear John,\n\nThank you for contacting Model Railway Scenes.\n\nYour order #MRS-5001 was dispatched on 28th January via Royal Mail Tracked 48 (tracking: RM111222333GB).\n\nYou can track your delivery at:\nhttps://track.royalmail.com/RM111222333GB\n\nExpected delivery: Tomorrow (2nd February)\n\nIf you have any questions, please don't hesitate to contact us.",
                aiAnalysis: { request: "Tracking number", orderId: "#MRS-5001", tone: "Polite", urgency: "Low" },
                hasDraft: true,
                status: "pending",
              },
              {
                id: "e2",
                conversationId: "conv-2",
                customerName: "Mary Wilson",
                customerEmail: "mary@example.com",
                orderId: "#MRS-5008",
                priority: "P2",
                receivedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
                originalSubject: "Where is my order?",
                originalBody: "Hello,\n\nCould you please let me know the status of order #MRS-5008? I ordered last week.\n\nBest regards,\nMary Wilson",
                aiResponse: "Dear Mary,\n\nThank you for getting in touch about your order.\n\nYour order #MRS-5008 was dispatched on 29th January via Royal Mail Tracked 48 (tracking: RM444555666GB).\n\nYou can track it here:\nhttps://track.royalmail.com/RM444555666GB\n\nExpected delivery: Monday (3rd February)\n\nPlease let us know if you need anything else.",
                aiAnalysis: { request: "Tracking number", orderId: "#MRS-5008", tone: "Polite", urgency: "Low" },
                hasDraft: true,
                status: "pending",
              },
              {
                id: "e3",
                conversationId: "conv-3",
                customerName: "Tom Brown",
                customerEmail: "tom@example.com",
                orderId: "#MRS-5012",
                priority: "P2",
                receivedAt: new Date(Date.now() - 7 * 3600000).toISOString(),
                originalSubject: "Tracking info please",
                originalBody: "Hi,\n\nI haven't received any dispatch notification for order #MRS-5012. Can you confirm it's been sent?\n\nThanks,\nTom Brown",
                aiResponse: "Dear Tom,\n\nThanks for reaching out.\n\nYour order #MRS-5012 was dispatched yesterday via Royal Mail Tracked 48 (tracking: RM777888999GB).\n\nTrack your delivery:\nhttps://track.royalmail.com/RM777888999GB\n\nExpected delivery: Tuesday (4th February)\n\nDon't hesitate to get in touch if you have any questions.",
                aiAnalysis: { request: "Tracking number", orderId: "#MRS-5012", tone: "Neutral", urgency: "Low" },
                hasDraft: true,
                status: "pending",
              },
              {
                id: "e4",
                conversationId: "conv-4",
                customerName: "Lisa Anderson",
                customerEmail: "lisa@example.com",
                orderId: "#MRS-5015",
                priority: "P3",
                receivedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
                originalSubject: "Order dispatch?",
                originalBody: "Good morning,\n\nJust wondering if my order #MRS-5015 has been dispatched yet?\n\nKind regards,\nLisa Anderson",
                aiResponse: "Dear Lisa,\n\nThank you for your patience.\n\nYour order #MRS-5015 was dispatched on 27th January via Royal Mail Tracked 48 (tracking: RM123456789GB).\n\nYou can track your delivery at:\nhttps://track.royalmail.com/RM123456789GB\n\nPlease allow 2-3 working days for delivery.\n\nBest wishes.",
                aiAnalysis: { request: "Tracking number", orderId: "#MRS-5015", tone: "Polite", urgency: "Low" },
                hasDraft: true,
                status: "pending",
              },
            ],
          },
          {
            id: "batch-2",
            type: "refund",
            label: "Refund Requests",
            emailCount: 3,
            aiSuggestion: "Process refunds and send confirmation",
            estimatedTimeSaved: 8,
            emails: [],
          },
          {
            id: "batch-3",
            type: "product_question",
            label: "Product Availability",
            emailCount: 4,
            aiSuggestion: "Send stock update playbook",
            estimatedTimeSaved: 6,
            emails: [],
          },
        ]);

        setRecentBatches([
          {
            id: "rb-1",
            type: "tracking",
            label: "Tracking Requests",
            status: "completed",
            emailCount: 5,
            sentCount: 5,
            savedCount: 0,
            errorCount: 0,
            completedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
            timeSaved: 9,
            createdBy: "Peter A",
          },
          {
            id: "rb-2",
            type: "refund",
            label: "Refund Confirmations",
            status: "partial",
            emailCount: 4,
            sentCount: 3,
            savedCount: 1,
            errorCount: 0,
            completedAt: new Date(Date.now() - 26 * 3600000).toISOString(),
            timeSaved: 7,
            createdBy: "Peter A",
          },
          {
            id: "rb-3",
            type: "tracking",
            label: "Tracking Requests",
            status: "completed",
            emailCount: 8,
            sentCount: 8,
            savedCount: 0,
            errorCount: 0,
            completedAt: new Date(Date.now() - 50 * 3600000).toISOString(),
            timeSaved: 14,
            createdBy: "Peter A",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleOpenBatch = useCallback((batch: BatchOpportunity) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  }, []);

  const handleSendAll = useCallback(async (emailIds: string[], batchId: string) => {
    console.log("Sending batch:", { batchId, emailIds });
    setIsModalOpen(false);
    setSelectedBatch(null);
  }, []);

  const handleSaveDrafts = useCallback(async (emailIds: string[], batchId: string) => {
    console.log("Saving drafts:", { batchId, emailIds });
    setIsModalOpen(false);
    setSelectedBatch(null);
  }, []);

  const handleRegenerateResponse = useCallback(async (emailId: string) => {
    console.log("Regenerating response for:", emailId);
    return "Regenerated response...";
  }, []);

  const totalOpportunities = batchOpportunities.reduce((sum, b) => sum + b.emailCount, 0);
  const totalTimeSaved = batchOpportunities.reduce((sum, b) => sum + b.estimatedTimeSaved, 0);
  const historicalTimeSaved = recentBatches.reduce((sum, b) => sum + b.timeSaved, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header - matches Dashboard and Settings Summary styling */}
      <div className="border-b border-border bg-card/50 px-8 py-6">
        <h1 className="text-2xl font-semibold text-foreground">Triage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your workflow and get started
        </p>
      </div>

      {/* Content - full width, horizontal padding only */}
      <div className="px-8 pb-8 pt-6">
        {/* Workflow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Queue View */}
          <button
            onClick={() => navigate("/customer/support/triage-queue")}
            className="text-left p-6 bg-muted/50 border border-border rounded-xl hover:bg-muted/70 hover:border-primary/30 transition-all group"
          >
            <QueueIcon />
            <h3 className="text-lg font-bold text-foreground mt-4 mb-1">Queue View</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Browse, search, and manage all emails with full flexibility
            </p>
            <div className="space-y-2">
              <CheckBullet>Search &amp; filter all emails</CheckBullet>
              <CheckBullet>Multi-select &amp; bulk actions</CheckBullet>
              <CheckBullet>Jump to any email</CheckBullet>
            </div>
          </button>

          {/* Workflow Mode */}
          <button
            onClick={() => navigate("/customer/support/triage?mode=workflow")}
            className="text-left p-6 bg-muted/50 border border-border rounded-xl hover:bg-muted/70 hover:border-purple-500/30 transition-all group"
          >
            <WorkflowIcon />
            <h3 className="text-lg font-bold text-foreground mt-4 mb-1">Workflow Mode</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Guided session to power through your queue efficiently
            </p>
            <div className="space-y-2">
              <CheckBullet>One-at-a-time focus</CheckBullet>
              <CheckBullet>Auto-prioritized by urgency</CheckBullet>
              <CheckBullet>Session tracking &amp; stats</CheckBullet>
            </div>
          </button>
        </div>

        {/* Batch Opportunities */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Batch Opportunities</h2>
              {totalOpportunities > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {totalOpportunities} emails across {batchOpportunities.length} groups · Est. {totalTimeSaved} minutes saved
                </p>
              )}
            </div>
            {recentBatches.length > 0 && (
              <button
                onClick={() => navigate("/customer/support/triage/history")}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                View history →
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scanning for batch opportunities...
            </div>
          ) : batchOpportunities.length > 0 ? (
            <div className="space-y-3">
              {batchOpportunities.map((opp) => (
                <BatchOpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onClick={() => handleOpenBatch(opp)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/50 border border-border rounded-xl">
              <svg className="w-8 h-8 mx-auto mb-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No batch opportunities right now</p>
              <p className="text-xs text-muted-foreground mt-1">AI will detect groups as new emails arrive</p>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-3">
            Click a batch to review individual emails before sending
          </p>
        </div>

        {/* Recent Batch History */}
        {recentBatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl font-semibold text-foreground">Recent Batches</h2>
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                {historicalTimeSaved}m total saved
              </span>
            </div>
            <div className="bg-muted/50 border border-border rounded-xl overflow-hidden">
              {recentBatches.map((batch) => (
                <RecentBatchRow key={batch.id} batch={batch} />
              ))}
            </div>
          </div>
        )}

        {/* Batch Review Modal */}
        {selectedBatch && (
          <BatchReviewModal
            batch={selectedBatch}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedBatch(null);
            }}
            onSendAll={handleSendAll}
            onSaveDrafts={handleSaveDrafts}
            onRegenerateResponse={handleRegenerateResponse}
          />
        )}
      </div>
    </div>
  );
}
