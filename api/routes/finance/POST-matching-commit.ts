import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const body = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const result = await api.commitFinanceMatch({
      transactionId: String(body?.transactionId || ""),
      ledgerEntryId: String(body?.ledgerEntryId || ""),
      markReconciled: Boolean(body?.markReconciled),
      reason: body?.reason ? String(body.reason) : undefined,
    });
    await reply.send({ ok: true, ...result });
  } catch (error) {
    logger.error({ error }, "Finance matching commit route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Matching commit failed" });
  }
};

export default route;
