import { Link } from "react-router";
import { useMemo } from "react";
import { useFindMany } from "@gadgetinc/react";
import { AlertTriangle, Layers3, ListChecks, PackageCheck, PackageX } from "lucide-react";
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

function KpiCard({
  label,
  value,
  subLabel,
  Icon,
}: {
  label: string;
  value: string | number;
  subLabel?: string;
  Icon: React.ElementType;
}) {
  return (
    <Card className="bg-card/50 border-border p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted/50 p-2 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {subLabel ? <p className="text-xs text-muted-foreground mt-1">{subLabel}</p> : null}
        </div>
      </div>
    </Card>
  );
}

export default function ProductionSummaryPage() {
  const [{ data: jobs, fetching: jobsFetching }] = useFindMany(api.productionJob, {
    first: 500,
    sort: { updatedAt: "Descending" } as any,
    select: {
      id: true,
      status: true,
      source: true,
      stationOrText: true,
      notes: true,
      updatedAt: true,
    } as any,
  });
  const [{ data: types }] = useFindMany(api.productionType, {
    first: 250,
    select: { id: true, isActive: true } as any,
  });
  const [{ data: batches }] = useFindMany(api.productionBatch, {
    first: 250,
    select: { id: true, status: true } as any,
  });

  const jobsData = (jobs as any[] | undefined) || [];
  const typesData = (types as any[] | undefined) || [];
  const batchesData = (batches as any[] | undefined) || [];

  const metrics = useMemo(() => {
    let openJobs = 0;
    let onHold = 0;
    let awaitingNameApprovals = 0;
    let awaitingNameDraft = 0;

    for (const job of jobsData) {
      const status = String(job?.status || "");
      const isClosed = status === "fulfilled" || status === "cancelled";
      if (!isClosed) openJobs += 1;
      if (status === "on_hold") onHold += 1;

      const missingStationName =
        job?.source === "shopify_order" &&
        !String(job?.stationOrText || "").trim();
      if (missingStationName) {
        const workflowStatus = String(parseNotes(job?.notes)?.emailWorkflow?.status || "not_started");
        if (workflowStatus === "drafted") awaitingNameApprovals += 1;
        if (workflowStatus === "not_started" || !workflowStatus) awaitingNameDraft += 1;
      }
    }

    const activeTypes = typesData.filter((t) => Boolean(t?.isActive)).length;
    const plannedOrInProgressBatches = batchesData.filter((b) =>
      ["planned", "in_progress"].includes(String(b?.status || ""))
    ).length;

    return {
      openJobs,
      onHold,
      awaitingNameApprovals,
      awaitingNameDraft,
      activeTypes,
      plannedOrInProgressBatches,
    };
  }, [batchesData, jobsData, typesData]);

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Production Suite Summary"
        subtitle="Roll-up health view across schedule, types, and batches"
        actions={
          <Button asChild variant="outline">
            <Link to="/production/schedule-summary">Open Schedule Summary</Link>
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <KpiCard
            label="Open Jobs"
            value={jobsFetching ? "…" : metrics.openJobs}
            subLabel="Excludes fulfilled/cancelled"
            Icon={PackageCheck}
          />
          <KpiCard
            label="On Hold"
            value={jobsFetching ? "…" : metrics.onHold}
            subLabel="Needs operator intervention"
            Icon={PackageX}
          />
          <KpiCard
            label="Missing Name Approvals"
            value={jobsFetching ? "…" : metrics.awaitingNameApprovals}
            subLabel="Draft ready, waiting your approval"
            Icon={AlertTriangle}
          />
          <KpiCard
            label="Missing Name Draft Needed"
            value={jobsFetching ? "…" : metrics.awaitingNameDraft}
            subLabel="No draft created yet"
            Icon={AlertTriangle}
          />
          <KpiCard
            label="Active Production Types"
            value={metrics.activeTypes}
            subLabel="Classification/routing definitions"
            Icon={ListChecks}
          />
          <KpiCard
            label="Open Batches"
            value={metrics.plannedOrInProgressBatches}
            subLabel="Planned + in progress"
            Icon={Layers3}
          />
        </div>

        <Card className="bg-card/50 border-border p-6">
          <h2 className="text-lg font-semibold text-foreground">Where to start each day</h2>
          <ol className="mt-3 list-decimal pl-5 text-sm text-muted-foreground space-y-1">
            <li>Open Schedule Summary and clear missing-name approval items first.</li>
            <li>Review on-hold jobs and resolve blockers.</li>
            <li>Check open batches, then move urgent queued items into today&apos;s run.</li>
          </ol>
          <div className="mt-4 flex gap-2">
            <Button asChild>
              <Link to="/production/schedule-summary">Go to Schedule Summary</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/production">Open Schedule Board</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
