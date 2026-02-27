import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const body = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const result = await api.suggestFinanceMatches({
      transactionId: body?.transactionId ? String(body.transactionId) : undefined,
      limit: body?.limit ? Number(body.limit) : undefined,
    });
    await reply.send({ ok: true, ...result });
  } catch (error) {
    logger.error({ error }, "Finance matching suggest route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Matching suggest failed" });
  }
};

export default route;
