import type { ActionOptions } from "gadget-server";

// ---------------------------------------------------------------------------
// rejectQuarantinedEmail
//
// Marks an emailQuarantine record as rejected.
//
// Params:
//   quarantineId   — the ID of the emailQuarantine record to reject
//   reason         — (optional) reason stored in classificationReason
// ---------------------------------------------------------------------------

export const run: ActionRun = async ({ logger, api, params }) => {
  const { quarantineId, reason } = params as any;

  if (!quarantineId) throw new Error("quarantineId is required");

  const records = await api.emailQuarantine.findMany({
    filter: { id: { equals: quarantineId } },
    select: {
      id: true,
      status: true,
      classificationReason: true,
    },
    first: 1,
  });

  const record = records[0];
  if (!record) throw new Error(`Quarantine record ${quarantineId} not found`);

  if (record.status === "rejected") {
    logger.info({ quarantineId }, "Already rejected, skipping");
    return { success: true, alreadyRejected: true };
  }

  if (record.status === "approved") {
    throw new Error("Cannot reject an approved quarantine record");
  }

  await api.emailQuarantine.update(quarantineId, {
    status: "rejected",
    rejectedAt: new Date(),
    classificationReason: reason || record.classificationReason || "manually rejected",
  } as any);

  return { success: true };
};

export const params = {
  quarantineId: { type: "string" },
  reason: { type: "string" },
};

export const options: ActionOptions = {
  timeoutMS: 60000,
  triggers: { api: true },
};
