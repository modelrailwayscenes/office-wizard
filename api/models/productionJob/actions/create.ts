import { applyParams, save, ActionOptions } from "gadget-server";
import { preventCrossUserDataAccess } from "gadget-server/auth";
import { logProductionEvent } from "../../../lib/production/events";

export const run: ActionRun = async ({ params, record, logger, api, connections }) => {
  applyParams(params, record);
  await preventCrossUserDataAccess(params, record);
  await save(record);
  const actorUserId = (params as any)?.assignedTo?._link || (params as any)?.actorUserId || null;
  await logProductionEvent({
    api,
    productionJobId: record.id,
    type: "created",
    actorUserId,
    toValue: {
      status: record.status,
      assignedTo: (record as any).assignedToId || null,
      batch: (record as any).batchId || null,
      notes: record.notes || null,
    },
  });
};

export const options: ActionOptions = {
  actionType: "create",
};
