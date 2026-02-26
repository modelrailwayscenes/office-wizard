import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossUserDataAccess } from "gadget-server/auth";
import { logProductionEvent } from "../../../lib/production/events";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  const before = {
    status: record.status,
    assignedToId: (record as any).assignedToId || null,
    batchId: (record as any).batchId || null,
    notes: record.notes || null,
  };
  applyParams(params, record);
  await preventCrossUserDataAccess(params, record);
  await save(record);

  const after = {
    status: record.status,
    assignedToId: (record as any).assignedToId || null,
    batchId: (record as any).batchId || null,
    notes: record.notes || null,
  };

  const actorUserId = (params as any)?.actorUserId || null;

  if (before.status !== after.status) {
    await logProductionEvent({
      api,
      productionJobId: record.id,
      type: "status_changed",
      actorUserId,
      fromValue: { status: before.status },
      toValue: { status: after.status },
    });
    return;
  }

  if (before.assignedToId !== after.assignedToId) {
    await logProductionEvent({
      api,
      productionJobId: record.id,
      type: "assigned",
      actorUserId,
      fromValue: { assignedTo: before.assignedToId },
      toValue: { assignedTo: after.assignedToId },
    });
    return;
  }

  if (before.batchId !== after.batchId) {
    await logProductionEvent({
      api,
      productionJobId: record.id,
      type: after.batchId ? "batched" : "unbatched",
      actorUserId,
      fromValue: { batch: before.batchId },
      toValue: { batch: after.batchId },
    });
    return;
  }

  if (before.notes !== after.notes) {
    await logProductionEvent({
      api,
      productionJobId: record.id,
      type: "note_added",
      actorUserId,
      fromValue: { notes: before.notes },
      toValue: { notes: after.notes },
    });
    return;
  }

  await logProductionEvent({
    api,
    productionJobId: record.id,
    type: "edited",
    actorUserId,
    fromValue: before,
    toValue: after,
  });
};

export const options: ActionOptions = {
  actionType: "update",
};
