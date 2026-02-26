import { useMemo, useState } from "react";
import { useAction, useFindMany, useGlobalAction, useUser } from "@gadgetinc/react";
import { format } from "date-fns";
import { Plus, RefreshCw } from "lucide-react";
import { api } from "../api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { SecondaryButton } from "@/shared/ui/Buttons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedBadge } from "@/components/UnifiedBadge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Card } from "@/components/ui/card";

const statusOptions = [
  "queued",
  "printing",
  "post_processing",
  "painting",
  "ready_to_dispatch",
  "dispatched",
  "on_hold",
  "cancelled",
  "fulfilled",
] as const;

const priorityOptions = ["P0", "P1", "P2", "P3"] as const;

const displayDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return format(dt, "dd MMM yyyy, HH:mm");
};

export default function ProductionSchedulePage() {
  const user = useUser(api, { select: { id: true, email: true } }) as any;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("queued");
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>("");
  const [newManualDialogOpen, setNewManualDialogOpen] = useState(false);
  const [newManualName, setNewManualName] = useState("");
  const [newManualQty, setNewManualQty] = useState("1");

  const filter = useMemo(() => {
    const clauses: any[] = [];
    if (statusFilter !== "all") clauses.push({ status: { equals: statusFilter } });
    if (priorityFilter !== "all") clauses.push({ priorityBand: { equals: priorityFilter } });
    if (search.trim()) {
      clauses.push({
        OR: [
          { stationOrText: { matches: search } },
          { productName: { matches: search } },
          { orderNumber: { matches: search } },
          { sku: { matches: search } },
          { externalRef: { matches: search } },
        ],
      });
    }
    return clauses.length > 0 ? { AND: clauses } : undefined;
  }, [priorityFilter, search, statusFilter]);

  const [{ data: jobs, fetching }, refreshJobs] = useFindMany(api.productionJob, {
    first: 300,
    sort: [{ priorityScore: "Descending" }, { dueBy: "Ascending" }] as any,
    filter: filter as any,
    select: {
      id: true,
      stationOrText: true,
      marketplace: true,
      status: true,
      orderNumber: true,
      daysToDeliver: true,
      orderDate: true,
      priorityBand: true,
      priorityScore: true,
      dueBy: true,
      productName: true,
      productionType: { id: true, name: true },
      scale: true,
      sides: true,
      style: true,
      textLines: true,
      colour: true,
      quantityRequired: true,
      externalRef: true,
      assignedTo: { id: true, email: true },
      notes: true,
      source: true,
      batch: { id: true, name: true, status: true, scheduledFor: true },
      createdAt: true,
      updatedAt: true,
    } as any,
  });
  const [{ data: types }] = useFindMany(api.productionType, {
    first: 200,
    filter: { isActive: { equals: true } } as any,
    select: { id: true, name: true } as any,
  });
  const [{ data: users }] = useFindMany(api.user, {
    first: 200,
    select: { id: true, email: true, emailVerified: true } as any,
  });
  const [{ data: events }] = useFindMany(api.productionEvent, {
    pause: !selectedJobId,
    first: 30,
    sort: { createdAt: "Descending" } as any,
    filter: selectedJobId ? ({ productionJob: { id: { equals: selectedJobId } } } as any) : undefined,
    select: {
      id: true,
      type: true,
      fromValue: true,
      toValue: true,
      actorUser: { id: true, email: true },
      createdAt: true,
    } as any,
  });

  const [{ fetching: updating }, updateJob] = useAction(api.productionJob.update);
  const [{ fetching: creating }, createJob] = useAction(api.productionJob.create);
  const [{ fetching: runningBulk }, runProductionBatchOperation] = useGlobalAction(api.runProductionBatchOperation);

  const jobsData = (jobs as any[] | undefined) || [];
  const allSelected = jobsData.length > 0 && jobsData.every((job) => selectedIds.includes(job.id));
  const selectedJob = jobsData.find((j) => j.id === selectedJobId) || null;

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((v) => v !== id)));
  };
  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? jobsData.map((j) => j.id) : []);
  };

  const runBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    if (["cancelled", "fulfilled"].includes(bulkStatus)) {
      const confirm = window.confirm(`Set ${selectedIds.length} jobs to ${bulkStatus}?`);
      if (!confirm) return;
    }
    await (runProductionBatchOperation as any)({
      action: "set_status",
      status: bulkStatus,
      jobIds: JSON.stringify(selectedIds),
    });
    await (runProductionBatchOperation as any)({
      action: "assign",
      assignToUserId: bulkAssignUserId || "",
      jobIds: JSON.stringify(selectedIds),
    });
    setSelectedIds([]);
    await refreshJobs();
  };

  const handleCreateManualJob = async () => {
    if (!newManualName.trim()) return;
    await (createJob as any)({
      source: "manual",
      productName: newManualName.trim(),
      quantityRequired: Math.max(Number(newManualQty || 1), 1),
      status: "queued",
      priorityBand: "P2",
      priorityScore: 60,
      orderDate: new Date().toISOString(),
      dueBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      externalRef: `manual:${Date.now()}`,
      marketplace: "manual",
      orderNumber: "MANUAL",
      productionType: (types as any[] | undefined)?.[0]?.id
        ? { _link: (types as any[])[0].id }
        : undefined,
      assignedTo: user?.id ? { _link: user.id } : undefined,
    });
    setNewManualDialogOpen(false);
    setNewManualName("");
    setNewManualQty("1");
    await refreshJobs();
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Production Schedule"
        subtitle="Prioritise and manage print work"
        actions={
          <>
            <SecondaryButton onClick={() => refreshJobs()} disabled={fetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </SecondaryButton>
            <Button onClick={() => setNewManualDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create manual job
            </Button>
          </>
        }
      />

      <div className="px-8 pb-8 pt-4 overflow-auto h-full">
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search station text, order #, SKU, external ID..."
            className="max-w-md"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {priorityOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 && (
          <div className="sticky top-2 z-20 mb-3 rounded-xl border border-border bg-card/95 px-3 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-foreground">{selectedIds.length} selected</span>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="Bulk status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={bulkAssignUserId || "unassigned"} onValueChange={(v) => setBulkAssignUserId(v === "unassigned" ? "" : v)}>
                <SelectTrigger className="w-[220px] h-8">
                  <SelectValue placeholder="Assign user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {(users as any[] | undefined)
                    ?.filter((u) => u?.emailVerified)
                    ?.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.email}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={runBulkUpdate} disabled={updating || runningBulk}>
                Apply bulk update
              </Button>
            </div>
          </div>
        )}

        <Card className="overflow-hidden border-border">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(Boolean(v))} />
                  </th>
                  <th className="px-3 py-2 text-left">Station / Text</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Order #</th>
                  <th className="px-3 py-2 text-left">Priority</th>
                  <th className="px-3 py-2 text-left">Due by</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Scale</th>
                  <th className="px-3 py-2 text-left">Qty</th>
                  <th className="px-3 py-2 text-left">External ID</th>
                </tr>
              </thead>
              <tbody>
                {jobsData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-10">
                      <EmptyState
                        title="No production jobs"
                        description="Use manual create or ingest new orders via webhook."
                      />
                    </td>
                  </tr>
                ) : (
                  jobsData.map((job) => (
                    <tr key={job.id} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(job.id)}
                          onCheckedChange={(v) => toggleOne(job.id, Boolean(v))}
                        />
                      </td>
                      <td className="px-3 py-2 cursor-pointer" onClick={() => setSelectedJobId(job.id)}>
                        {job.stationOrText || "—"}
                      </td>
                      <td className="px-3 py-2">
                        <UnifiedBadge type={job.status} label={job.status} />
                      </td>
                      <td className="px-3 py-2">{job.orderNumber || "—"}</td>
                      <td className="px-3 py-2">
                        <UnifiedBadge type={job.priorityBand === "P0" ? "urgent" : job.priorityBand === "P1" ? "high" : job.priorityBand === "P2" ? "medium" : "low"} label={job.priorityBand || "P3"} />
                      </td>
                      <td className="px-3 py-2">{displayDate(job.dueBy)}</td>
                      <td className="px-3 py-2">{job.productName}</td>
                      <td className="px-3 py-2">{job.productionType?.name || "—"}</td>
                      <td className="px-3 py-2">{job.scale || "—"}</td>
                      <td className="px-3 py-2">{job.quantityRequired}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{job.externalRef || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Drawer open={Boolean(selectedJobId)} onOpenChange={(open) => !open && setSelectedJobId(null)} direction="right">
        <DrawerContent direction="right" hideHandle className="w-full sm:max-w-2xl bg-card border-border overflow-y-auto p-0">
          <div className="border-b border-border bg-card/50 px-6 py-5 sticky top-0 z-10">
            <DrawerTitle className="text-xl font-semibold text-foreground">Production Job Details</DrawerTitle>
          </div>
          <div className="px-6 py-6">
            {!selectedJob ? (
              <div className="text-muted-foreground text-sm">No job selected.</div>
            ) : (
              <Tabs defaultValue="job" className="w-full">
                <TabsList>
                  <TabsTrigger value="job">Job</TabsTrigger>
                  <TabsTrigger value="order">Order</TabsTrigger>
                  <TabsTrigger value="production">Production</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="job" className="space-y-3 mt-4">
                  <div className="text-sm text-muted-foreground">Product</div>
                  <div className="text-base text-foreground font-semibold">{selectedJob.productName}</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>Station/Text: {selectedJob.stationOrText || "—"}</div>
                    <div>Source: {selectedJob.source}</div>
                    <div>Status: {selectedJob.status}</div>
                    <div>Priority: {selectedJob.priorityBand}</div>
                    <div>Qty: {selectedJob.quantityRequired}</div>
                    <div>Due by: {displayDate(selectedJob.dueBy)}</div>
                  </div>
                </TabsContent>
                <TabsContent value="order" className="space-y-3 mt-4 text-sm">
                  <div>Order #: {selectedJob.orderNumber || "—"}</div>
                  <div>Marketplace: {selectedJob.marketplace || "—"}</div>
                  <div>Order date: {displayDate(selectedJob.orderDate)}</div>
                  <div>External ref: {selectedJob.externalRef || "—"}</div>
                  <div>SKU: {selectedJob.sku || "—"}</div>
                </TabsContent>
                <TabsContent value="production" className="space-y-3 mt-4 text-sm">
                  <div>Type: {selectedJob.productionType?.name || "—"}</div>
                  <div>Scale: {selectedJob.scale || "—"}</div>
                  <div>Sides: {selectedJob.sides || "—"}</div>
                  <div>Style: {selectedJob.style || "—"}</div>
                  <div>Lines: {selectedJob.textLines || "—"}</div>
                  <div>Colour: {selectedJob.colour || "—"}</div>
                  <div>Batch: {selectedJob.batch?.name || "—"}</div>
                </TabsContent>
                <TabsContent value="activity" className="space-y-2 mt-4">
                  {((events as any[] | undefined) || []).length === 0 ? (
                    <div className="text-sm text-muted-foreground">No activity yet.</div>
                  ) : (
                    ((events as any[] | undefined) || []).map((evt) => (
                      <div key={evt.id} className="rounded-lg border border-border p-3">
                        <div className="text-xs text-muted-foreground">
                          {evt.type} • {evt.actorUser?.email || "system"} • {displayDate(evt.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={newManualDialogOpen} onOpenChange={setNewManualDialogOpen}>
        <DrawerContent className="max-w-lg mx-auto p-6">
          <DrawerTitle>Create manual production job</DrawerTitle>
          <div className="space-y-3 mt-4">
            <Input value={newManualName} onChange={(e) => setNewManualName(e.target.value)} placeholder="Product name" />
            <Input value={newManualQty} onChange={(e) => setNewManualQty(e.target.value)} type="number" min="1" placeholder="Quantity" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setNewManualDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateManualJob} disabled={creating}>
                {creating ? "Creating..." : "Create job"}
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
