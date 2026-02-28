import { useMemo, useState } from "react";
import { useFindMany, useFindFirst } from "@gadgetinc/react";
import { AlertTriangle, CheckCircle2, ExternalLink, Inbox, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/shared/ui/PageHeader";
import { toast } from "sonner";
import { api } from "@/api";

type ReassignmentSuggestion = {
  id: string;
  task: string;
  fromUser: string;
  toUser: string;
  reason: string;
  confidence: number;
};

const INITIAL_SUGGESTIONS: ReassignmentSuggestion[] = [
  {
    id: "sg-1",
    task: "Personalised sign QA · Order MRS-21113",
    fromUser: "Pete",
    toUser: "Ops teammate",
    reason: "SLA at risk in 18h and alternate user has free capacity block.",
    confidence: 0.91,
  },
  {
    id: "sg-2",
    task: "Pack + label regular orders (batch of 4)",
    fromUser: "Pete",
    toUser: "Ops teammate",
    reason: "Batching fit and reduced context switching.",
    confidence: 0.87,
  },
];

export default function PlannerHomePage() {
  const [{ data: configData }] = useFindFirst(api.appConfiguration, {
    select: { connectedMailbox: true } as any,
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

  const [suggestions, setSuggestions] = useState<ReassignmentSuggestion[]>(INITIAL_SUGGESTIONS);
  const [feedbackLog, setFeedbackLog] = useState<Array<{ suggestionId: string; signal: "good" | "bad"; reason: string }>>([]);

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
    };
  }, [latestMessages, openConversations]);

  const onConfirm = (suggestion: ReassignmentSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
    toast.success(`Reassignment confirmed: ${suggestion.task}`);
  };

  const onFeedback = (
    suggestion: ReassignmentSuggestion,
    signal: "good" | "bad",
    reason: string
  ) => {
    setFeedbackLog((prev) => [{ suggestionId: suggestion.id, signal, reason }, ...prev].slice(0, 20));
    toast.success("Feedback captured for scheduler training");
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
        </div>

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
              {suggestions.map((suggestion) => (
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
                      Confirm
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{suggestion.reason}</div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => onFeedback(suggestion, "good", "Good suggestion")}
                    >
                      Good
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => onFeedback(suggestion, "bad", "Bad assignee/time slot")}
                    >
                      Needs correction
                    </Button>
                  </div>
                </div>
              ))}
              {suggestions.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
                  No pending reassignment suggestions.
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
              {feedbackLog.map((item, idx) => (
                <div key={`${item.suggestionId}-${idx}`} className="rounded border border-border bg-muted/20 px-3 py-2 text-xs">
                  <span className={item.signal === "good" ? "text-green-500" : "text-amber-500"}>
                    {item.signal === "good" ? "Accepted" : "Correction"}
                  </span>
                  <span className="text-muted-foreground"> · {item.reason} · {item.suggestionId}</span>
                </div>
              ))}
              {feedbackLog.length === 0 ? (
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
