import { useMemo, useState } from "react";
import { useAction, useFindMany, useUser } from "@gadgetinc/react";
import { format } from "date-fns";
import { Plus, Save } from "lucide-react";
import { api } from "../api";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const batchStatuses = ["planned", "in_progress", "done"];

const displayDate = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy HH:mm");
};

export default function ProductionBatchesPage() {
  const user = useUser(api, { select: { id: true, email: true } }) as any;
  const [{ data: batches }, refreshBatches] = useFindMany(api.productionBatch, {
    first: 200,
    sort: { scheduledFor: "Descending" } as any,
    select: {
      id: true,
      name: true,
      status: true,
      scheduledFor: true,
      printerProfileId: true,
      createdByUser: { id: true, email: true },
      productionJobs: { edges: { node: { id: true, status: true, productName: true } } } as any,
      updatedAt: true,
    } as any,
  });
  const [{ data: unbatchedJobs }, refreshJobs] = useFindMany(api.productionJob, {
    first: 300,
    sort: [{ priorityScore: "Descending" }, { dueBy: "Ascending" }] as any,
    filter: { batch: { isSet: false }, status: { in: ["queued", "printing", "post_processing", "painting"] } } as any,
    select: { id: true, productName: true, status: true, priorityBand: true, orderNumber: true } as any,
  });
  const [{ fetching: creating }, createBatch] = useAction(api.productionBatch.create);
  const [{ fetching: updating }, updateBatch] = useAction(api.productionBatch.update);
  const [{ fetching: updateJobFetching }, updateJob] = useAction(api.productionJob.update);

  const [batchName, setBatchName] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [statusDraft, setStatusDraft] = useState("planned");

  const batchRows = (batches as any[] | undefined) || [];
  const selectedBatch = useMemo(
    () => batchRows.find((b) => b.id === selectedBatchId) || null,
    [batchRows, selectedBatchId]
  );

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      toast.error("Batch name is required");
      return;
    }
    const created = await (createBatch as any)({
      name: batchName.trim(),
      status: "planned",
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      createdByUser: user?.id ? { _link: user.id } : undefined,
    });
    setBatchName("");
    setScheduledFor("");
    if (created?.id) {
      setSelectedBatchId(created.id);
      setStatusDraft(created.status || "planned");
    }
    await refreshBatches();
  };

  const handleAttachJob = async () => {
    if (!selectedBatchId || !selectedJobId) return;
    await (updateJob as any)({ id: selectedJobId, batch: { _link: selectedBatchId } });
    setSelectedJobId("");
    await Promise.all([refreshJobs(), refreshBatches()]);
    toast.success("Job added to batch");
  };

  const handleDetachJob = async (jobId: string) => {
    await (updateJob as any)({ id: jobId, batch: null });
    await Promise.all([refreshJobs(), refreshBatches()]);
    toast.success("Job detached from batch");
  };

  const handleStatusSave = async () => {
    if (!selectedBatchId) return;
    await (updateBatch as any)({ id: selectedBatchId, status: statusDraft });
    await refreshBatches();
    toast.success("Batch status updated");
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader title="Production Batches" subtitle="Plan and track grouped print runs" />
      <div className="px-8 pb-8 pt-4 grid grid-cols-12 gap-4 h-full overflow-hidden">
        <Card className="col-span-4 p-4 overflow-auto">
          <div className="text-sm font-semibold mb-3">Create batch</div>
          <div className="space-y-2 mb-4">
            <Input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="Batch name" />
            <Input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            <Button onClick={handleCreateBatch} disabled={creating} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>

          <div className="text-sm font-semibold mb-2">Existing batches</div>
          <div className="space-y-1">
            {batchRows.map((batch) => (
              <button
                type="button"
                key={batch.id}
                onClick={() => {
                  setSelectedBatchId(batch.id);
                  setStatusDraft(batch.status || "planned");
                }}
                className={`w-full text-left rounded-lg px-3 py-2 ${
                  selectedBatchId === batch.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <div className="text-sm font-medium">{batch.name}</div>
                <div className="text-xs text-muted-foreground">
                  {batch.status} • {displayDate(batch.scheduledFor)}
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="col-span-8 p-4 overflow-auto">
          {!selectedBatch ? (
            <div className="text-sm text-muted-foreground">Select a batch to manage jobs and status.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-base font-semibold">{selectedBatch.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created by {selectedBatch.createdByUser?.email || "system"} • {displayDate(selectedBatch.scheduledFor)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={statusDraft} onValueChange={setStatusDraft}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {batchStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleStatusSave} disabled={updating}>
                    <Save className="h-4 w-4 mr-2" />
                    Save status
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="text-sm font-medium">Attach unbatched job</div>
                <div className="flex gap-2">
                  <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent>
                      {((unbatchedJobs as any[] | undefined) || []).map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.orderNumber || "NO-ORDER"} • {job.productName} • {job.priorityBand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAttachJob} disabled={updateJobFetching || !selectedJobId}>
                    Attach
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left">Order #</th>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {((selectedBatch.productionJobs?.edges as any[]) || []).map((edge) => (
                      <tr key={edge.node.id} className="border-b border-border/60">
                        <td className="px-3 py-2">{edge.node.orderNumber || "—"}</td>
                        <td className="px-3 py-2">{edge.node.productName}</td>
                        <td className="px-3 py-2">{edge.node.status}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => handleDetachJob(edge.node.id)}>
                            Detach
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {((selectedBatch.productionJobs?.edges as any[]) || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-sm text-muted-foreground">
                          No jobs attached yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
