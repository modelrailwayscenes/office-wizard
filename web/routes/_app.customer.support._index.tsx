import { useState, useEffect, useMemo } from "react";
import { useSession, useFindMany, useFindFirst } from "@gadgetinc/react";
import { useDashboardConversationsQuery } from "@/hooks/useConversationsQuery";
import { Link as RouterLink, useLocation } from "react-router";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Pie, PieChart, Cell } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { api } from "../api";
import { timeAgo } from "@/components/healthStatus";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Mail,
  CheckCircle2,
  FileText,
  TrendingUp,
  AlertCircle,
  Clock,
  Settings,
  Layers,
  MessageSquare,
  PenLine,
  LayoutDashboard,
  CircleHelp,
  ShieldAlert,
} from "lucide-react";
import { SidebarBrandHeader } from "@/components/SidebarBrandHeader";
import { CustomerSupportSidebar } from "@/components/CustomerSupportSidebar";

export default function Dashboard() {
  const session = useSession();
  const user = session?.user;
  const location = useLocation();

  // Fix hydration mismatch by using client-side state
  const [displayName, setDisplayName] = useState("there");
  const [todayLabel, setTodayLabel] = useState("Today");

  const startOfDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  useEffect(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    setTodayLabel(`${day}/${month}/${year}`);
  }, []);

  useEffect(() => {
    if (user?.firstName) {
      setDisplayName(user.firstName);
    }
  }, [user?.firstName]);

  const { data: conversationsRaw, isLoading: conversationsFetching } = useDashboardConversationsQuery({
    startOfDay,
  });

  const [{ data: configData }] = useFindFirst(api.appConfiguration, {
    select: {
      lastSyncAt: true,
      microsoftConnectionStatus: true,
      autoTriageEnabled: true,
    },
  });
  const [{ data: quarantineData, fetching: quarantineFetching }] = useFindMany(api.emailQuarantine, {
    filter: { status: { equals: "pending_review" } },
    select: { id: true },
    first: 200,
  });

  const conversations = (conversationsRaw || []) as any[];
  const config = configData as any;
  const quarantineCount = (quarantineData as any[] | undefined)?.length ?? 0;

  const {
    total,
    unresolved,
    urgentHigh,
    untriaged,
    drafts,
    unread,
    priorityCounts,
    statusCounts,
    hourlyBuckets,
    maxHourly,
    triagedCount,
  } = useMemo(() => {
    const totals = {
      total: 0,
      unresolved: 0,
      urgentHigh: 0,
      untriaged: 0,
      drafts: 0,
      unread: 0,
      triagedCount: 0,
    };
    const priorityCounts: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      unclassified: 0,
    };
    const statusCounts: Record<string, number> = {
      new: 0,
      in_progress: 0,
      waiting_customer: 0,
      waiting_internal: 0,
      resolved: 0,
      archived: 0,
    };
    const hourlyBuckets = Array.from({ length: 24 }, () => 0);

    conversations.forEach((conv) => {
      totals.total += 1;
      const status = conv.status || "new";
      const band = conv.currentPriorityBand || "unclassified";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      priorityCounts[band] = (priorityCounts[band] || 0) + 1;

      if (!["resolved", "archived"].includes(status)) totals.unresolved += 1;
      if (["urgent", "high"].includes(band)) totals.urgentHigh += 1;
      if (conv.lastTriagedAt) totals.triagedCount += 1;
      if (!conv.lastTriagedAt) totals.untriaged += 1;
      if (conv.hasDraft) totals.drafts += 1;
      if ((conv.unreadCount || 0) > 0) totals.unread += 1;

      const dateValue = conv.latestMessageAt;
      if (dateValue) {
        const date = new Date(dateValue);
        if (!Number.isNaN(date.getTime())) {
          hourlyBuckets[date.getHours()] += 1;
        }
      }
    });

    const maxHourly = Math.max(1, ...hourlyBuckets);

    return {
      total: totals.total,
      unresolved: totals.unresolved,
      urgentHigh: totals.urgentHigh,
      untriaged: totals.untriaged,
      drafts: totals.drafts,
      unread: totals.unread,
      triagedCount: totals.triagedCount,
      priorityCounts,
      statusCounts,
      hourlyBuckets,
      maxHourly,
    };
  }, [conversations]);

  const priorityOrder = ["urgent", "high", "medium", "low", "unclassified"];
  const statusOrder = ["new", "in_progress", "waiting_customer", "waiting_internal", "resolved"];
  const priorityTotal = priorityOrder.reduce((sum, band) => sum + (priorityCounts[band] || 0), 0);
  const triageRatio = total ? Math.round((triagedCount / total) * 100) : 0;
  const draftRatio = total ? Math.round((drafts / total) * 100) : 0;

  const welcomeMessage = `Welcome back, ${displayName}`;

  const KpiCard = ({
    label,
    value,
    Icon,
    tone,
    subLabel,
  }: {
    label: string;
    value: string | number;
    Icon: React.ElementType;
    tone: string;
    subLabel?: string;
  }) => (
    <Card className="bg-card/50 border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {subLabel && <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>}
        </div>
      </div>
    </Card>
  );

  const bandStyles: Record<string, string> = {
    urgent: "bg-red-500/80",
    high: "bg-orange-500/80",
    medium: "bg-amber-500/70",
    low: "bg-emerald-500/70",
    unclassified: "bg-muted/70",
  };

  return (
    <div className="flex flex-1 min-h-0 bg-background text-foreground">
      <CustomerSupportSidebar currentPath={location.pathname} />

      <div className="flex-1 overflow-auto bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card/50 px-8 py-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {welcomeMessage}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a workflow to get started
          </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span className="text-muted-foreground font-medium">Today</span> · {todayLabel}
            </div>
            <div className="text-xs text-muted-foreground">
              {conversationsFetching ? "Refreshing metrics..." : "Live from conversation activity"}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <KpiCard
              label="Conversations Today"
              value={total}
              Icon={Mail}
              tone="bg-muted/50 text-muted-foreground"
              subLabel={`${unread} with unread`}
            />
            <KpiCard
              label="Unresolved"
              value={unresolved}
              Icon={AlertCircle}
              tone="bg-amber-500/10 text-amber-300"
              subLabel="Awaiting attention"
            />
            <KpiCard
              label="Urgent + High"
              value={urgentHigh}
              Icon={TrendingUp}
              tone="bg-red-500/10 text-red-300"
              subLabel="Priority workload"
            />
            <KpiCard
              label="Untriaged"
              value={untriaged}
              Icon={Layers}
              tone="bg-sky-500/10 text-sky-300"
              subLabel={`${triageRatio}% triaged`}
            />
            <KpiCard
              label="Quarantine"
              value={quarantineCount}
              Icon={ShieldAlert}
              tone="bg-amber-500/10 text-amber-300"
              subLabel={
                quarantineFetching
                  ? "Loading..."
                  : quarantineCount > 0
                  ? "Pending review"
                  : "Clear"
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Priority Mix</h2>
                <span className="text-xs text-muted-foreground">{priorityTotal} conversations</span>
              </div>
              <ChartContainer
                config={{
                  urgent: { label: "Urgent", color: "hsl(var(--red-500))" },
                  high: { label: "High", color: "hsl(var(--orange-500))" },
                  medium: { label: "Medium", color: "hsl(var(--amber-500))" },
                  low: { label: "Low", color: "hsl(var(--emerald-500))" },
                  unclassified: { label: "Unclassified", color: "var(--muted-foreground)" },
                }}
                className="mt-4 h-[200px] w-full"
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                  <Pie
                    data={priorityOrder.map((band) => {
                      const count = priorityCounts[band] || 0;
                      return { name: band, value: count };
                    }).filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityOrder.filter((b) => (priorityCounts[b] || 0) > 0).map((band, i) => (
                      <Cell key={band} fill={["#ef4444", "#f97316", "#eab308", "#10b981", "#64748b"][i % 5]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </Card>

            <Card className="bg-card/50 border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Activity by Hour</h2>
                <span className="text-xs text-muted-foreground">Latest message time</span>
              </div>
              <ChartContainer
                config={{ conversations: { label: "Conversations", color: "hsl(var(--teal-500))" } }}
                className="mt-4 h-[200px] w-full"
              >
                <BarChart
                  data={hourlyBuckets.map((count, idx) => ({ hour: idx, conversations: count }))}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="hour" tick={{ fill: "rgb(148 163 184)" }} fontSize={10} />
                  <YAxis tick={{ fill: "rgb(148 163 184)" }} fontSize={10} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="conversations" fill="rgb(20 184 166 / 0.5)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-card/50 border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Status Overview</h2>
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {statusOrder.map((status) => (
                  <div key={status} className="rounded-lg border border-border bg-card/40 px-3 py-3">
                    <div className="text-xs text-muted-foreground uppercase">{status.replace("_", " ")}</div>
                    <div className="text-xl font-semibold text-foreground">{statusCounts[status] || 0}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-card/50 border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Automation Coverage</h2>
                <span className="text-xs text-muted-foreground">Today</span>
              </div>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Triage coverage</span>
                    <span>{triageRatio}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${triageRatio}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {triagedCount} triaged · {untriaged} pending
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Drafts created</span>
                    <span>{draftRatio}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-amber-500/70" style={{ width: `${draftRatio}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {drafts} drafts ready
                  </p>
                </div>
              </div>
            </Card>

            <Card className="bg-card/50 border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">System Activity</h2>
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Last sync</span>
                  <span className="text-muted-foreground">{timeAgo(config?.lastSyncAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Microsoft</span>
                  <span className="text-muted-foreground">{config?.microsoftConnectionStatus || "unknown"}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Auto-triage</span>
                  <span className="text-muted-foreground">{config?.autoTriageEnabled ? "enabled" : "disabled"}</span>
                </div>
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
