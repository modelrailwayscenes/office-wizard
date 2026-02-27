import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const body = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const result = await api.ingestFinanceEmails({
      maxMessages: body?.maxMessages ? Number(body.maxMessages) : undefined,
      folder: body?.folder ? String(body.folder) : undefined,
    });
    await reply.send({ ok: true, ...result });
  } catch (error) {
    logger.error({ error }, "Finance email ingest route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Finance email ingest failed" });
  }
};

export default route;
