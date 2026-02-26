import { ActionOptions } from "gadget-server";

export const params = {
  action: { type: "string" }, // set_status | assign | add_to_batch | remove_from_batch
  jobIds: { type: "string" }, // JSON array
  status: { type: "string" },
  assignToUserId: { type: "string" },
  batchId: { type: "string" },
  note: { type: "string" },
};

const parseStringArrayParam = (raw: unknown, fieldName: string): string[] => {
  if (raw == null || raw === "") return [];
  if (typeof raw !== "string") throw new Error(`${fieldName} must be a JSON string`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${fieldName}`);
  }
  if (!Array.isArray(parsed)) throw new Error(`${fieldName} must be a JSON array`);
  return parsed.filter((v) => typeof v === "string") as string[];
};

export const run = async ({ params, api, session }: any) => {
  const action = String(params.action || "");
  const jobIds = parseStringArrayParam(params.jobIds, "jobIds");
  if (jobIds.length === 0) throw new Error("jobIds is required");

  const userRef = session?.get("user");
  const actorUserId = typeof userRef === "string" ? userRef : userRef?._link || userRef?.id || null;

  const results: Array<{ jobId: string; status: "ok" | "error"; error?: string }> = [];

  for (const id of jobIds) {
    try {
      if (action === "set_status") {
        await api.productionJob.update({
          id,
          status: params.status,
          actorUserId,
        });
      } else if (action === "assign") {
        await api.productionJob.update({
          id,
          assignedTo: params.assignToUserId ? { _link: params.assignToUserId } : null,
          actorUserId,
        });
      } else if (action === "add_to_batch") {
        await api.productionJob.update({
          id,
          batch: params.batchId ? { _link: params.batchId } : null,
          actorUserId,
        });
      } else if (action === "remove_from_batch") {
        await api.productionJob.update({
          id,
          batch: null,
          actorUserId,
        });
      } else if (action === "note") {
        await api.productionJob.update({
          id,
          notes: String(params.note || ""),
          actorUserId,
        });
      } else {
        throw new Error(`Unsupported action ${action}`);
      }
      results.push({ jobId: id, status: "ok" });
    } catch (error: any) {
      results.push({ jobId: id, status: "error", error: error?.message || String(error) });
    }
  }

  const errors = results.filter((r) => r.status === "error").length;
  return {
    ok: errors === 0,
    action,
    total: jobIds.length,
    successCount: jobIds.length - errors,
    errorCount: errors,
    results,
  };
};

export const options: ActionOptions = {};
