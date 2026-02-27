import { Link } from "react-router";
import { useMemo } from "react";
import { useFindMany } from "@gadgetinc/react";
import { AlertTriangle, MailWarning, Package, PauseCircle } from "lucide-react";
import { api } from "../api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const parseNotes = (raw: unknown): Record<string, any> => {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, any>;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return {};
  }
};

const hasMissingStationName = (job: any) =>
  job?.source === "shopify_order" && !String(job?.stationOrText || "").trim();

export default function ProductionScheduleSummaryPage() {
  const [{ data: jobs, fetching }, refresh] = useFindMany(api.productionJob, {
    first: 500,
    sort: [{ priorityScore: "Descending" }, { updatedAt: "Descending" }] as any,
    select: {
      id: true,
      productName: true,
      orderNumber: true,
      status: true,
      source: true,
      stationOrText: true,
      notes: true,
      priorityBand: true,
      dueBy: true,
      updatedAt: true,
    } as any,
  });

  const jobsData = (jobs as any[] | undefined) || [];

  const { awaitingApproval, awaitingDraft, onHoldJobs, urgentQueued } = useMemo(() => {
    const awaitingApproval: any[] = [];
    const awaitingDraft: any[] = [];
    const onHoldJobs: any[] = [];
    const urgentQueued: any[] = [];

    for (const job of jobsData) {
      const status = String(job?.status || "");
      if (status === "on_hold") onHoldJobs.push(job);
      if (status === "queued" && ["P0", "P1"].includes(String(job?.priorityBand || ""))) urgentQueued.push(job);

      if (!hasMissingStationName(job)) continue;
      const workflowStatus = String(parseNotes(job?.notes)?.emailWorkflow?.status || "not_started");
      if (workflowStatus === "drafted") awaitingApproval.push(job);
      else if (!workflowStatus || workflowStatus === "not_started") awaitingDraft.push(job);
    }

    return { awaitingApproval, awaitingDraft, onHoldJobs, urgentQueued };
  }, [jobsData]);

  const ActionList = ({
    title,
    icon: Icon,
    rows,
    empty,
    view,
  }: {
    title: string;
    icon: React.ElementType;
    rows: any[];
    empty: string;
    view: string;
  }) => (
    <Card className="bg-card/50 border-border p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <Link to={`/production?view=${view}`} className="text-xs text-primary hover:underline">
          Open filtered
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-3">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.slice(0, 8).map((job) => (
            <Link
              key={job.id}
              to={`/production?view=${view}`}
              className="block rounded-lg border border-border px-3 py-2 hover:bg-muted/30 transition-colors"
            >
              <div className="text-sm font-medium text-foreground">{job.productName}</div>
              <div className="text-xs text-muted-foreground">
                {job.orderNumber || "No order #"} · {job.priorityBand || "P3"} · {job.status}
              </div>
            </Link>
          ))}
          {rows.length > 8 ? (
            <p className="text-xs text-muted-foreground pt-1">Showing first 8 of {rows.length}</p>
          ) : null}
        </div>
      )}
    </Card>
  );

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Schedule Summary"
        subtitle="Daily action queue for Production operators"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refresh()} disabled={fetching}>
              {fetching ? "Refreshing..." : "Refresh"}
            </Button>
            <Button asChild>
              <Link to="/production">Open Full Schedule</Link>
            </Button>
          </div>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Awaiting email approval</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{awaitingApproval.length}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Draft not created</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{awaitingDraft.length}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">On hold jobs</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{onHoldJobs.length}</div>
          </Card>
          <Card className="bg-card/50 border-border p-4">
            <div className="text-xs text-muted-foreground">Urgent queued</div>
            <div className="text-2xl font-semibold text-foreground mt-1">{urgentQueued.length}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActionList
            title="Needs approval: missing station name"
            icon={MailWarning}
            rows={awaitingApproval}
            empty="No approval items waiting."
            view="missing_name_approval"
          />
          <ActionList
            title="Needs draft: missing station name"
            icon={AlertTriangle}
            rows={awaitingDraft}
            empty="No missing-name draft tasks."
            view="missing_name_draft"
          />
          <ActionList
            title="On hold jobs"
            icon={PauseCircle}
            rows={onHoldJobs}
            empty="No on-hold jobs."
            view="on_hold"
          />
          <ActionList
            title="Urgent queued jobs"
            icon={Package}
            rows={urgentQueued}
            empty="No urgent queued jobs."
            view="urgent_queued"
          />
        </div>
      </div>
    </div>
  );
}
