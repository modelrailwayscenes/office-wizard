import { useMemo } from "react";
import { useFindMany, useFindFirst, useGlobalAction } from "@gadgetinc/react";
import { AlertTriangle, CheckCircle2, ExternalLink, Inbox, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui/PageHeader";
import { toast } from "sonner";
import { api } from "@/api";

const asArray = <T = any>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default function PlannerHomePage() {
  const [{ data: configData }] = useFindFirst(api.appConfiguration, {
    select: {
      connectedMailbox: true,
      plannerWorkItemsJson: true,
      plannerScheduleBlocksJson: true,
      plannerReassignSuggestionsJson: true,
      plannerFeedbackLogJson: true,
      plannerLastIngestAt: true,
      plannerLastPlanAt: true,
    } as any,
  });
  const [, refreshConfig] = useFindFirst(api.appConfiguration, {
    select: { id: true } as any,
  });
  const [{ data: latestMessages }] = useFindMany(api.emailMessage, {
    first: 8,
    sort: { receivedDateTime: "Descending" } as any,
    select: {
      id: true,
      subject: true,
      fromName: true,
      fromAddress: true,
      receivedDateTime: true,
    } as any,
  });
  const [{ data: openConversations }] = useFindMany(api.conversation, {
    first: 500,
    filter: { status: { notIn: ["resolved", "archived"] } } as any,
    select: {
      id: true,
      currentPriorityBand: true,
      deadlineDate: true,
    } as any,
  });

  const [{ fetching: ingesting }, ingestShopifyWorkItems] = useGlobalAction(api.ingestPlannerShopifyWorkitems);
  const [{ fetching: planning }, generatePlan] = useGlobalAction(api.generatePlannerSchedule);
  const [{ fetching: confirming }, confirmReassignment] = useGlobalAction(api.confirmPlannerReassignment);
  const [{ fetching: savingFeedback }, submitFeedback] = useGlobalAction(api.submitPlannerSchedulerFeedback);

  const plannerWorkItems = useMemo(
    () => asArray<any>((configData as any)?.plannerWorkItemsJson),
    [configData]
  );
  const plannerSuggestions = useMemo(
    () => asArray<any>((configData as any)?.plannerReassignSuggestionsJson),
    [configData]
  );
  const plannerFeedback = useMemo(
    () => asArray<any>((configData as any)?.plannerFeedbackLogJson),
    [configData]
  );

  const kpis = useMemo(() => {
    const rows = (openConversations as any[] | undefined) || [];
    const urgent = rows.filter((r) => r.currentPriorityBand === "urgent").length;
    const atRisk = rows.filter((r) => {
      if (!r.deadlineDate) return false;
      const deadline = new Date(r.deadlineDate).getTime();
      return deadline > Date.now() && deadline - Date.now() <= 24 * 60 * 60 * 1000;
    }).length;
    return {
      open: rows.length,
      urgent,
      atRisk,
      outlook: ((latestMessages as any[] | undefined) || []).length,
      plannerWorkItems: plannerWorkItems.length,
      plannerSuggestions: plannerSuggestions.length,
    };
  }, [latestMessages, openConversations, plannerSuggestions.length, plannerWorkItems.length]);

  const refreshPlannerConfig = async () => {
    await refreshConfig();
  };

  const onIngest = async () => {
    try {
      const result = (await ingestShopifyWorkItems({ includeClosed: false })) as any;
      await refreshPlannerConfig();
      toast.success(`Ingested planner work items: ${result?.created ?? 0} new, ${result?.updated ?? 0} updated`);
    } catch (error: any) {
      toast.error(error?.message || "Planner ingest failed");
    }
  };

  const onPlan = async () => {
    try {
      const result = (await generatePlan({ horizonDays: 3 })) as any;
      await refreshPlannerConfig();
      toast.success(
        `Plan generated: ${result?.blocksGenerated ?? 0} blocks, ${result?.suggestionsGenerated ?? 0} suggestions`
      );
    } catch (error: any) {
      toast.error(error?.message || "Planner schedule generation failed");
    }
  };

  const onConfirm = async (suggestion: any) => {
    try {
      await confirmReassignment({ suggestionId: suggestion.id });
      await refreshPlannerConfig();
      toast.success(`Reassignment confirmed: ${suggestion.task}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm reassignment");
    }
  };

  const onFeedback = async (suggestion: any, signal: "good" | "bad", reason: string) => {
    try {
      await submitFeedback({
        suggestionId: suggestion.id,
        taskId: suggestion.taskId || null,
        signal,
        reason,
      } as any);
      await refreshPlannerConfig();
      toast.success("Feedback captured for scheduler training");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save feedback");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Planner Home"
        subtitle="Hybrid workflow orchestration with cautious one-click confirms"
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="https://outlook.office.com/mail/" target="_blank" rel="noreferrer">
                Open Outlook
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Open work items</div>
            <div className="mt-1 text-2xl font-semibold">{kpis.open}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Urgent now (P0)</div>
            <div className="mt-1 text-2xl font-semibold text-red-500">{kpis.urgent}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">SLA at risk (24h)</div>
            <div className="mt-1 text-2xl font-semibold text-amber-500">{kpis.atRisk}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Outlook intake samples</div>
            <div className="mt-1 text-2xl font-semibold">{kpis.outlook}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Planner work items</div>
            <div className="mt-1 text-2xl font-semibold">{kpis.plannerWorkItems}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Reassign suggestions</div>
            <div className="mt-1 text-2xl font-semibold">{kpis.plannerSuggestions}</div>
          </Card>
        </div>

        <Card className="bg-card/50 border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onIngest} disabled={ingesting}>
              {ingesting ? "Ingesting..." : "Ingest Shopify Work"}
            </Button>
            <Button variant="outline" onClick={onPlan} disabled={planning}>
              {planning ? "Planning..." : "Generate Schedule"}
            </Button>
            <Button variant="ghost" onClick={refreshPlannerConfig}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Planner Data
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              Last ingest: {(configData as any)?.plannerLastIngestAt ? new Date((configData as any).plannerLastIngestAt).toLocaleString() : "—"} ·
              Last plan: {(configData as any)?.plannerLastPlanAt ? new Date((configData as any).plannerLastPlanAt).toLocaleString() : "—"}
            </div>
          </div>
        </Card>

        <Card className="bg-card/50 border-border p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Outlook workbench (inside Planner)</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We show synced Outlook messages in-app and deep-link to Outlook for full mailbox UI.
              </p>
            </div>
            <Badge variant="outline">Mailbox: {(configData as any)?.connectedMailbox || "not connected"}</Badge>
          </div>
          <div className="mt-4 rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground bg-muted/30">
              Latest synced messages
            </div>
            <div className="divide-y divide-border">
              {((latestMessages as any[] | undefined) || []).map((message) => (
                <div key={message.id} className="px-3 py-2 flex items-center gap-3">
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate">{message.subject || "(No subject)"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {message.fromName || message.fromAddress || "Unknown sender"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {message.receivedDateTime ? new Date(message.receivedDateTime).toLocaleString() : "—"}
                  </div>
                </div>
              ))}
              {!latestMessages || (latestMessages as any[]).length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">No synced messages yet.</div>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="bg-card/50 border-border p-6">
            <h2 className="text-lg font-semibold">One-click reassignment (cautious mode)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Suggestions are proposed only. Nothing auto-commits until you press confirm.
            </p>
            <div className="mt-4 space-y-3">
              {plannerSuggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-lg border border-border p-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{suggestion.task}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {suggestion.fromUser} → {suggestion.toUser} · confidence {suggestion.confidence.toFixed(2)}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => onConfirm(suggestion)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {confirming ? "Confirming..." : "Confirm"}
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{suggestion.reason}</div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => onFeedback(suggestion, "good", "Good suggestion")}
                      disabled={savingFeedback}
                    >
                      Good
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => onFeedback(suggestion, "bad", "Bad assignee/time slot")}
                      disabled={savingFeedback}
                    >
                      Needs correction
                    </Button>
                  </div>
                </div>
              ))}
              {plannerSuggestions.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                  No pending reassignment suggestions. Generate a schedule to produce recommendations.
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="bg-card/50 border-border p-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Learning feedback trail
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Captured feedback is kept as explicit training signals for future scheduling recommendations.
            </p>
            <div className="mt-4 space-y-2">
              {plannerFeedback.map((item, idx) => (
                <div key={`${item.id || item.suggestionId}-${idx}`} className="rounded border border-border bg-muted/20 px-3 py-2 text-xs">
                  <span className={item.signal === "good" ? "text-green-500" : "text-amber-500"}>
                    {item.signal === "good" ? "Accepted" : "Correction"}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {item.reason} · {item.suggestionId || item.taskId || "manual"} ·{" "}
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                  </span>
                </div>
              ))}
              {plannerFeedback.length === 0 ? (
                <div className="rounded border border-border bg-muted/20 px-3 py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  No feedback captured yet. Use “Good” or “Needs correction” on suggestions.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
