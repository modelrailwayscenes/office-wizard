import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ request, reply, api, logger }) => {
  try {
    const body = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const action = String(body?.action || "");
    const jobIds = Array.isArray(body?.jobIds) ? body.jobIds.map(String) : [];
    if (!action || jobIds.length === 0) {
      await reply.code(400).send({ ok: false, error: "action and jobIds are required" });
      return;
    }

    const result = await api.runProductionBatchOperation({
      action,
      jobIds: JSON.stringify(jobIds),
      status: body?.status ? String(body.status) : undefined,
      assignToUserId: body?.assignToUserId ? String(body.assignToUserId) : undefined,
      batchId: body?.batchId ? String(body.batchId) : undefined,
      note: body?.note ? String(body.note) : undefined,
    });

    await reply.send({ ok: true, result });
  } catch (error) {
    logger.error({ error }, "Failed production jobs bulk route");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Bulk route failed" });
  }
};

export default route;
