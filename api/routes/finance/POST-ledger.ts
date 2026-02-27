import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const body = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const created = await api.financeLedgerEntry.create({
      entryDate: body?.entryDate || new Date().toISOString(),
      direction: body?.direction || "expense",
      description: body?.description || "Manual ledger entry",
      grossAmount: Number(body?.grossAmount || 0),
      netAmount: body?.netAmount != null ? Number(body.netAmount) : undefined,
      vatAmount: body?.vatAmount != null ? Number(body.vatAmount) : undefined,
      currency: body?.currency || "GBP",
      paymentStatus: body?.paymentStatus || "unpaid",
      status: body?.status || "draft",
      createdFrom: "manual",
    } as any);
    await reply.send({ ok: true, id: created?.id });
  } catch (error) {
    logger.error({ error }, "Finance POST ledger route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Create ledger entry failed" });
  }
};

export default route;
