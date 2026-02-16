import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Batch History Page
 * 
 * Shows all past batch operations with filtering, stats, and drill-down.
 * 
 * Deploy to: /web/routes/_app.triage.history.tsx
 */

// ─── Types ───────────────────────────────────────────────────────────
interface BatchOperation {
  id: string;
  type: string;
  label: string;
  status: "completed" | "partial" | "failed" | "in_progress";
  emailCount: number;
  sentCount: number;
  savedCount: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
  timeSaved: number;
  createdBy: string;
  notes?: string;
  conversations: {
    id: string;
    customerName: string;
    customerEmail: string;
    orderId?: string;
    resultStatus: "sent" | "draft" | "error" | "skipped";
  }[];
}

// ─── Status Badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Completed" },
    partial: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Partial" },
    failed: { bg: "bg-red-500/20", text: "text-red-400", label: "Failed" },
    in_progress: { bg: "bg-blue-500/20", text: "text-blue-400", label: "In Progress" },
  };
  const c = config[status] || config.completed;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ─── Type Badge ──────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    tracking: { bg: "bg-teal-500/20", text: "text-teal-400", label: "Tracking" },
    refund: { bg: "bg-amber-500/20", text: "text-amber-400", label: "Refund" },
    product_question: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Product Q" },
    general: { bg: "bg-slate-500/20", text: "text-slate-400", label: "General" },
    draft_send: { bg: "bg-purple-500/20", text: "text-purple-400", label: "Draft Send" },
    resolve: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "Resolve" },
  };
  const c = config[type] || config.general;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || "text-slate-100"}`}>{value}</p>
    </div>
  );
}

// ─── Expanded Batch Detail ───────────────────────────────────────────
function BatchDetail({ batch }: { batch: BatchOperation }) {
  const resultIcons: Record<string, { icon: string; color: string }> = {
    sent: { icon: "✓", color: "text-emerald-400" },
    draft: { icon: "◐", color: "text-amber-400" },
    error: { icon: "✕", color: "text-red-400" },
    skipped: { icon: "—", color: "text-slate-500" },
  };

  return (
    <div className="px-4 pb-4 border-t border-slate-700/30 mt-2">
      {/* Progress bar */}
      <div className="mt-4 mb-4">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>Progress</span>
          <span>{batch.sentCount + batch.savedCount} / {batch.emailCount} processed</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
          {batch.sentCount > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${(batch.sentCount / batch.emailCount) * 100}%` }}
            />
          )}
          {batch.savedCount > 0 && (
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${(batch.savedCount / batch.emailCount) * 100}%` }}
            />
          )}
          {batch.errorCount > 0 && (
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${(batch.errorCount / batch.emailCount) * 100}%` }}
            />
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {batch.sentCount} sent
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {batch.savedCount} saved
          </span>
          {batch.errorCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {batch.errorCount} errors
            </span>
          )}
        </div>
      </div>

      {/* Conversation list */}
      {batch.conversations.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Conversations ({batch.conversations.length})
          </p>
          {batch.conversations.map((conv) => {
            const ri = resultIcons[conv.resultStatus] || resultIcons.skipped;
            return (
              <div key={conv.id} className="flex items-center gap-3 px-3 py-2 bg-slate-900/40 rounded-md text-xs">
                <span className={`font-mono font-bold ${ri.color}`}>{ri.icon}</span>
                <span className="text-slate-300 font-medium">{conv.customerName}</span>
                <span className="text-slate-600">{conv.customerEmail}</span>
                {conv.orderId && (
                  <span className="text-slate-500 font-mono">{conv.orderId}</span>
                )}
                <span className={`ml-auto capitalize ${ri.color}`}>{conv.resultStatus}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes */}
      {batch.notes && (
        <div className="mt-3 p-3 bg-slate-900/40 rounded-md">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Notes</p>
          <p className="text-xs text-slate-400">{batch.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function BatchHistoryPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<BatchOperation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // ── Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    // TODO: Replace with actual Gadget API call
    // const [{ data }] = useFindMany(api.batchOperation, {
    //   sort: { createdAt: "Descending" },
    //   select: { id: true, type: true, ... }
    // });

    setIsLoading(true);
    setTimeout(() => {
      setBatches([
        {
          id: "bo-1",
          type: "tracking",
          label: "Tracking Requests",
          status: "completed",
          emailCount: 7,
          sentCount: 7,
          savedCount: 0,
          errorCount: 0,
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          completedAt: new Date(Date.now() - 2 * 3600000 + 45000).toISOString(),
          timeSaved: 12,
          createdBy: "Peter A",
          conversations: [
            { id: "c1", customerName: "John Smith", customerEmail: "john@example.com", orderId: "#MRS-5001", resultStatus: "sent" },
            { id: "c2", customerName: "Mary Wilson", customerEmail: "mary@example.com", orderId: "#MRS-5008", resultStatus: "sent" },
            { id: "c3", customerName: "Tom Brown", customerEmail: "tom@example.com", orderId: "#MRS-5012", resultStatus: "sent" },
            { id: "c4", customerName: "Lisa Anderson", customerEmail: "lisa@example.com", orderId: "#MRS-5015", resultStatus: "sent" },
          ],
        },
        {
          id: "bo-2",
          type: "refund",
          label: "Refund Confirmations",
          status: "partial",
          emailCount: 4,
          sentCount: 3,
          savedCount: 1,
          errorCount: 0,
          createdAt: new Date(Date.now() - 26 * 3600000).toISOString(),
          completedAt: new Date(Date.now() - 26 * 3600000 + 30000).toISOString(),
          timeSaved: 7,
          createdBy: "Peter A",
          notes: "Saved draft for Sarah's refund - needs manager approval for amount over £50",
          conversations: [
            { id: "c5", customerName: "David Lee", customerEmail: "david@example.com", orderId: "#MRS-4998", resultStatus: "sent" },
            { id: "c6", customerName: "Sarah Chen", customerEmail: "sarah@example.com", orderId: "#MRS-5003", resultStatus: "draft" },
            { id: "c7", customerName: "James Taylor", customerEmail: "james@example.com", orderId: "#MRS-5006", resultStatus: "sent" },
            { id: "c8", customerName: "Emma White", customerEmail: "emma@example.com", orderId: "#MRS-5010", resultStatus: "sent" },
          ],
        },
        {
          id: "bo-3",
          type: "tracking",
          label: "Tracking Requests",
          status: "completed",
          emailCount: 8,
          sentCount: 8,
          savedCount: 0,
          errorCount: 0,
          createdAt: new Date(Date.now() - 50 * 3600000).toISOString(),
          completedAt: new Date(Date.now() - 50 * 3600000 + 60000).toISOString(),
          timeSaved: 14,
          createdBy: "Peter A",
          conversations: [],
        },
        {
          id: "bo-4",
          type: "product_question",
          label: "Product Availability",
          status: "completed",
          emailCount: 3,
          sentCount: 3,
          savedCount: 0,
          errorCount: 0,
          createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
          completedAt: new Date(Date.now() - 72 * 3600000 + 25000).toISOString(),
          timeSaved: 5,
          createdBy: "Peter A",
          conversations: [],
        },
      ]);
      setIsLoading(false);
    }, 500);
  }, []);

  // ── Filter logic ───────────────────────────────────────────────────
  const filteredBatches = batches.filter((b) => {
    if (filterType !== "all" && b.type !== filterType) return false;
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    return true;
  });

  // ── Aggregate stats ────────────────────────────────────────────────
  const totalSent = batches.reduce((s, b) => s + b.sentCount, 0);
  const totalTimeSaved = batches.reduce((s, b) => s + b.timeSaved, 0);
  const totalBatches = batches.length;

  // ── Format date ────────────────────────────────────────────────────
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/triage")}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Batch History</h1>
            <p className="text-sm text-slate-400 mt-0.5">Review past batch operations and results</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Batches" value={totalBatches} />
        <StatCard label="Emails Sent" value={totalSent} />
        <StatCard label="Time Saved" value={`${totalTimeSaved}m`} accent="text-emerald-400" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Type:</span>
          {["all", "tracking", "refund", "product_question"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filterType === t
                  ? "bg-teal-500/20 text-teal-400 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {t === "all" ? "All" : t === "product_question" ? "Product Q" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Status:</span>
          {["all", "completed", "partial", "failed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                filterStatus === s
                  ? "bg-teal-500/20 text-teal-400 font-medium"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Batch List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading batch history...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-800/20 border border-slate-700/30 rounded-lg">
          <p className="text-sm">No batches match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/50 transition-colors"
            >
              {/* Row Header */}
              <button
                onClick={() => setExpandedId(expandedId === batch.id ? null : batch.id)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left"
              >
                {/* Type + Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-200">{batch.label}</span>
                    <TypeBadge type={batch.type} />
                    <StatusBadge status={batch.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {batch.sentCount} sent · {batch.savedCount} drafts
                    {batch.errorCount > 0 && ` · ${batch.errorCount} errors`}
                    {" · "}{formatDate(batch.createdAt)}
                    {" · "}{batch.createdBy}
                  </p>
                </div>

                {/* Time saved */}
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-emerald-400">{batch.timeSaved}m</span>
                  <p className="text-[10px] text-slate-600">saved</p>
                </div>

                {/* Expand */}
                <svg
                  className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${
                    expandedId === batch.id ? "rotate-180" : ""
                  }`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Expanded Detail */}
              {expandedId === batch.id && <BatchDetail batch={batch} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  }