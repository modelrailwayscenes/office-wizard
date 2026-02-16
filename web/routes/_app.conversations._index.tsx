import { useState } from "react";
import { useNavigate } from "react-router";
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
import { useGlobalAction } from "@gadgetinc/react";
import { toast } from "sonner";
import { RefreshCw, Search } from "lucide-react";
import { SentimentBadge } from "@/components/SentimentBadge";
import { UnifiedBadge } from "@/components/UnifiedBadge";

export default function ConversationsIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const [{ fetching: fetchingEmails }, fetchEmails] = useGlobalAction(api.fetchEmails);
  const [{ fetching: rebuildingConversations }, rebuildConversations] = useGlobalAction(api.rebuildConversations);

  const handleFetchEmails = async () => {
    try {
      await fetchEmails({});
      toast.success("Emails fetched successfully");
    } catch (error) {
      toast.error(`Failed to fetch emails: ${error}`);
    }
  };

  const handleRebuildConversations = async () => {
    try {
      const result = await rebuildConversations({});
      const r = result as any;
      toast.success(`Rebuilt ${r?.created ?? 0} conversations (${r?.skipped ?? 0} skipped)`);
    } catch (error) {
      toast.error(`Rebuild failed: ${error}`);
    }
  };

  const handleRowClick = (record: any) => {
    navigate(`/conversations/${record.id}`);
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

  const buildFilter = () => {
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
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* UPDATED HEADER - Outside content area, consistent structure */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Conversations</h1>
            <p className="text-sm text-slate-400 mt-1">
              View and manage all email conversations
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRebuildConversations}
              disabled={rebuildingConversations}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${rebuildingConversations ? "animate-spin" : ""}`} />
              {rebuildingConversations ? "Rebuilding..." : "Rebuild Conversations"}
            </Button>
            <Button
              onClick={handleFetchEmails}
              disabled={fetchingEmails}
              className="bg-teal-500 hover:bg-teal-600 text-black font-medium"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${fetchingEmails ? "animate-spin" : ""}`} />
              {fetchingEmails ? "Fetching..." : "Fetch New Emails"}
            </Button>
          </div>
        </div>
      </div>

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
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <AutoTable
            model={api.conversation}
            columns={[
              {
                header: "Subject",
                render: ({ record }) => (
                  <div className="flex items-center gap-3 py-1">
                    <SentimentBadge sentiment={record.sentiment} />
                    <span className="truncate max-w-sm text-slate-100 text-sm font-medium">
                      {record.subject || "—"}
                    </span>
                  </div>
                ),
              },
              {
                header: "Customer",
                render: ({ record }) => (
                  <span className="text-slate-300 text-sm">{record.primaryCustomerEmail || "—"}</span>
                ),
              },
              {
                header: "Classification",
                render: ({ record }) => {
                  const node = record.classifications?.edges?.[0]?.node;
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
                    type={record.currentPriorityBand} 
                    label={getPriorityLabel(record.currentPriorityBand)} 
                  />
                ),
              },
              {
                header: "Status",
                render: ({ record }) => {
                  const s = getStatusBadge(record.status);
                  return (
                    <UnifiedBadge 
                      type={record.status} 
                      label={s.label} 
                    />
                  );
                },
              },
              {
                header: "Messages",
                render: ({ record }) => (
                  <span className="text-slate-400 text-sm">{record.messageCount ?? "—"}</span>
                ),
              },
              {
                header: "Last Activity",
                render: ({ record }) => (
                  <span className="text-slate-400 text-sm">
                    {record.latestMessageAt
                      ? new Date(record.latestMessageAt).toLocaleDateString("en-GB", {
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
      </div>

    </div>
  );
}
