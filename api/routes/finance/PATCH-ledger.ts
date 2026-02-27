import { RouteHandler } from "gadget-server";

const route: RouteHandler = async ({ api, request, reply, logger }) => {
  try {
    const body = typeof (request as any).body === "string" ? JSON.parse((request as any).body) : (request as any).body;
    const id = String(body?.id || "");
    if (!id) {
      await reply.code(400).send({ ok: false, error: "id is required" });
      return;
    }
    const existing = await api.financeLedgerEntry.findOne(id, {
      select: { id: true, status: true } as any,
    });
    if (!existing) {
      await reply.code(404).send({ ok: false, error: "Ledger entry not found" });
      return;
    }
    if (existing.status === "locked" && !body?.unlockReason) {
      await reply.code(400).send({ ok: false, error: "Locked entries require unlockReason" });
      return;
    }
    const updated = await api.financeLedgerEntry.update(id, {
      description: body?.description,
      grossAmount: body?.grossAmount != null ? Number(body.grossAmount) : undefined,
      netAmount: body?.netAmount != null ? Number(body.netAmount) : undefined,
      vatAmount: body?.vatAmount != null ? Number(body.vatAmount) : undefined,
      paymentStatus: body?.paymentStatus,
      status: body?.status,
    } as any);
    await reply.send({ ok: true, id: updated?.id });
  } catch (error) {
    logger.error({ error }, "Finance PATCH ledger route failed");
    await reply.code(500).send({ ok: false, error: error instanceof Error ? error.message : "Update ledger entry failed" });
  }
};

export default route;
